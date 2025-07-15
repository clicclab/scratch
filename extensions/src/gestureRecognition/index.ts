import { Environment, buttonBlock, extension } from "$common";
import { legacyFullSupport, } from "./legacy";
import * as tf from '@tensorflow/tfjs';
import { MediaPipePoseDetector, normalizeSkeletonToHipCenter } from "./mediapipe";
import { PoseDataPoint } from "./types";
import { filterToUsedLandmarks } from "./poseLandmarks";
import { NNClassifierModel, nnPredict } from "./nn";
import { classifyWithKnnModel } from "./knn";
import { dtwDistance } from "./dtw";

const { legacyBlock, legacyExtension } = legacyFullSupport.for<gestureRecognition>();
const VideoState = {
  /** Video turned off. */
  OFF: 'off',
  /** Video turned on with default y axis mirroring. */
  ON: 'on',
  /** Video turned on without default y axis mirroring. */
  ON_FLIPPED: 'on-flipped',
} as const;

const dynamicClassMenu = (self: gestureRecognition) => ({
  argumentMethods: { 0: { getItems: () => self.getClasses() } }
})

@legacyExtension()
export default class gestureRecognition extends extension({
  name: "Gesture Recognition",
  description: "Use your Gesture Recognition models in your Scratch project!",
  iconURL: "gesture-recognition-blocks.png",
  insetIconURL: "gesture-recognition-blocks-small.svg",
  tags: ["Dancing with AI", "Made by PRG"]
}, "indicators") {
  lastUpdate: number;
  maxConfidence: number;
  modelConfidences: {};
  isPredicting: number;
  predictionState = {};
  teachableImageModel;
  latestAudioResults: any;
  poseDetector: MediaPipePoseDetector | null = null;

  test: string = "";

  /**
   * Prediction refresh rate
   * @type {number}
   */
  INTERVAL = 500;

  /**
   * Dimensions of the video frame
   * @type {number[]}
   */
  DIMENSIONS = [480, 360];

  ModelType = {
    POSE: 'pose',
    IMAGE: 'image',
    AUDIO: 'audio',
  };

  init(env: Environment) {

    /**
     * The last millisecond epoch timestamp that the video stream was
     * analyzed.
     * @type {number}
     */
    this.lastUpdate = null;


    // What is the confidence of the latest prediction
    this.maxConfidence = null;
    this.modelConfidences = {};

    if (this.runtime.ioDevices) {
      // Configure the video device with values from globally stored locations.
      // this.runtime.on(Runtime.PROJECT_LOADED, this.updateVideoDisplay.bind(this));

      // Kick off looping the analysis logic.
      this._loop();
    }
  }


  isKnnModel(model: any): boolean {
    return model && Array.isArray(model.segments);
  }
  
  isNNModel(model: any): boolean {
    return model && Array.isArray(model.outputLabels);
  }

  /**
     * Occasionally run prediction on pose data
     * @private
     */
  _loop() {
    setTimeout(this._loop.bind(this), Math.max(this.runtime.currentStepTime, this.INTERVAL));

    // Skip if model not loaded
    if(!this.teachableImageModel) {
      return;
    }

    // Predict using model
    let data = this.poseRecordingData.slice(-50);
    if (data.length < 50) {
      // If we don't have enough data, skip this frame
      return;
    }

    let poseData = data.map(pose => {
        let temp = normalizeSkeletonToHipCenter(pose.landmarks);
        temp = filterToUsedLandmarks(temp);
        return {
          ...pose, landmarks: temp 
        };
    }).map((pose: any) => {
        // pose is an array of landmarks
        return pose.landmarks.flatMap((l: any) => [l.x, l.y, l.z]);
    });

    let inputFeatures = poseData[0].length * 3;

    let model = this.getPredictionStateOrStartPredicting(this.teachableImageModel);

    if (!model) {
      console.warn("No model loaded for prediction");
      return;
    }

    let result;
    if (this.isNNModel(model)) {
      // This is a NNClassifierModel
      result = nnPredict(model, poseData, inputFeatures);
      console.log("NN prediction result:", result);
    } else if (this.isKnnModel(model)) {
      // This is a kNNClassifierModel
      result = classifyWithKnnModel(model, poseData, dtwDistance);
      console.log("kNN prediction result:", result);
    } else {
      console.log("Unknown model", model);
    }

    // Shorten poseRecordingData
    if (this.poseRecordingData.length > 100) {
      this.poseRecordingData = this.poseRecordingData.slice(-50);
    }
  }

    poseDetectionFrame: number | null = null;
    poseRecordingData: PoseDataPoint[] = [];

    startPoseDetectionLoop() {
      const detect = () => {

        const frame = this.runtime.ioDevices.video.getFrame({
          format: 'image-data',
          dimensions: this.DIMENSIONS
        });

        if (!this.poseDetector || !frame) {
          this.poseDetectionFrame = requestAnimationFrame(detect);
          return;
        }

        // Detect pose landmarks in the current video frame
        const landmarks = this.poseDetector.detectPose(frame);

        if (landmarks && landmarks.landmarks.length > 0) {
            this.poseRecordingData.push({
                timestamp: Date.now(),
                landmarks: landmarks.landmarks,
                videoLandmarks: landmarks.videoLandmarks,
            });
          }
        this.poseDetectionFrame = requestAnimationFrame(detect);
      };

      this.poseDetectionFrame = requestAnimationFrame(detect);
  }

  async predictAllBlocks(frame) {
    for (let modelUrl in this.predictionState) {
      if (!this.predictionState[modelUrl].model) {
        continue;
      }
      if (this.teachableImageModel !== modelUrl) {
        continue;
      }
      ++this.isPredicting;
      const prediction = await this.predictModel(modelUrl, frame);
      this.predictionState[modelUrl].topClass = prediction;
      // this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED);
      --this.isPredicting;
    }
  }

  async predictModel(modelUrl, frame) {
    const predictions = await this.getPredictionFromModel(modelUrl, frame);
    if (!predictions) {
      return;
    }
    let maxProbability = 0;
    let maxClassName = "";
    for (let i = 0; i < predictions.length; i++) {
      const probability = predictions[i].probability.toFixed(2);
      const className = predictions[i].className;
      this.modelConfidences[className] = probability; // update for reporter block
      if (probability > maxProbability) {
        maxClassName = className;
        maxProbability = probability;
      }
    }
    this.maxConfidence = maxProbability; // update for reporter block
    return maxClassName;
  }

  async getPredictionFromModel(modelUrl, frame) {
    const { model, modelType } = this.predictionState[modelUrl];
    switch (modelType) {
      case this.ModelType.IMAGE:
        if (!frame) return null;
        const imageBitmap = await createImageBitmap(frame);
        return await model.predict(imageBitmap);
      case this.ModelType.POSE:
        if (!frame) return null;
        const { pose, posenetOutput } = await model.estimatePose(frame);
        return await model.predict(posenetOutput);
      case this.ModelType.AUDIO:
        if (this.latestAudioResults) {
          return model.wordLabels().map((label, i) => {
            return { className: label, probability: this.latestAudioResults.scores[i] }
          });
        } else {
          return null;
        }
    }
  }

  async setUpPoseDetection() {
    if (this.poseDetector) {
      return; // Already initialized
    }

    console.log("Starting pose detection");
    this.poseDetector = new MediaPipePoseDetector();
    await this.poseDetector.initialize();
    this.startPoseDetectionLoop();
  }

  /**
   * A scratch reporter that returns the top class seen in the current video frame
   * @returns {string} class name if video frame matched, empty string if model not loaded yet
   */
  getModelPrediction() {
    const modelUrl = this.teachableImageModel;
    const predictionState: { topClass: string } = this.getPredictionStateOrStartPredicting(modelUrl);
    if (!predictionState) {
      return '';
    }
    return predictionState.topClass;
  }


  /**
   * Accepts a base64-encoded JSON string representing a KnnClassifierModel or NNClassifierModel.
   * Decodes, parses, and stores the model for prediction.
   */
  async useModel(base64Model: string) {
    try {
      // Decode base64 to JSON string (opposite of exportNNModelToBase64)
      const exportStr = decodeURIComponent(escape(atob(base64Model)));
      const parsed = JSON.parse(exportStr);
      // If this is a NNClassifierModel export, it will have json, weights
      if (parsed.json && parsed.weights) {
        const { json, weights } = parsed;
        const modelTopology = JSON.parse(json).modelTopology;
        const weightSpecs = JSON.parse(json).weightSpecs;
        const outputLabels = JSON.parse(json).outputLabels || [];
        const weightData = new Uint8Array(weights).buffer;
        tf.loadLayersModel({
          load() {
            return Promise.resolve({ modelTopology, weightSpecs, weightData });
          }
        }).then(loadedModel => {
          const modelKey = `model_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
          const modelObj = { outputLabels, weights: loadedModel };
          this.predictionState[modelKey] = modelObj;
          this.updateStageModel(modelKey);
          console.log("Loaded NNClassifierModel from base64", modelKey, modelObj);
        });
      } else {
        // Assume it's a plain JSON model (e.g., kNN)
        const modelKey = `model_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
        this.predictionState[modelKey] = parsed;
        this.updateStageModel(modelKey);
        console.log("Loaded kNN model from base64", modelKey, parsed);
      }
    } catch (e) {
      this.teachableImageModel = null;
      console.error("Failed to load model from base64 string", e);
    }

    await this.setUpPoseDetection();
  }

  updateStageModel(modelUrl) {
    const stage = this.runtime.getTargetForStage();
    this.teachableImageModel = modelUrl;
    if (stage) {
      (stage as any).teachableImageModel = modelUrl;
    }
  }

  getPredictionStateOrStartPredicting(modelUrl, override = false) {
    const hasPredictionState = this.predictionState.hasOwnProperty(modelUrl);
    if (!hasPredictionState || override) {
      return null;
    }
    return this.predictionState[modelUrl];
  }

  getClasses() {
    if (
      !this.teachableImageModel ||
      !this.predictionState ||
      !this.predictionState[this.teachableImageModel] ||
      !this.predictionState[this.teachableImageModel].hasOwnProperty('model')
    ) {
      return ["Select a class"];
    }

    if (this.predictionState[this.teachableImageModel].modelType === this.ModelType.AUDIO) {
      return this.predictionState[this.teachableImageModel].model.wordLabels();
    }

    return this.predictionState[this.teachableImageModel].model.getClassLabels();
  }

  model_match(state) {
    const modelUrl = this.teachableImageModel;
    const className = state;

    const predictionState = this.getPredictionStateOrStartPredicting(modelUrl);
    if (!predictionState) {
      return false;
    }

    const currentMaxClass = predictionState.topClass;
    return (currentMaxClass === String(className));
  }

  getClassConfidence(state): number {
    return this.modelConfidences[state];
  }

  /**
   * Turns the video camera off/on/on and flipped. This is called in the operation of videoToggleBlock
   * @param state 
   */
  toggleVideo(state: string) {
    if (state === VideoState.OFF) return this.runtime.ioDevices.video.disableVideo();

    this.runtime.ioDevices.video.enableVideo();
    // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
    this.runtime.ioDevices.video.mirror = (state === VideoState.ON);
  }

  /**
   * Sets the video's transparency. This is called in the operation of setVideoTransparencyBlock
   * @param transparency 
   */
  setTransparency(transparency: number) {
    const trans = Math.max(Math.min(transparency, 100), 0);
    this.runtime.ioDevices.video.setPreviewGhost(trans);
  }

  /**
   * Opens a new tab with the Google Gesture Recognition website
   */
  @buttonBlock("Gesture Recognition Site ↗")
  openGestureRecognition() {
    window.open('https://clicclab.github.io/SensorTimeline', '_blank');
  }

  @buttonBlock("Set model")
  setModelButton() {
    this.showModelInputModal();
  }

  /**
   * Show a modal dialog with a textarea for base64 model input (no length limit).
   */
  showModelInputModal() {
    // Remove any existing modal
    const existing = document.getElementById('gesture-model-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gesture-model-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '24px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.2)';
    box.style.maxWidth = '90vw';
    box.style.width = '400px';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '12px';

    const label = document.createElement('label');
    label.textContent = 'Paste base64 model string:';
    label.style.marginBottom = '4px';

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '120px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';
    textarea.placeholder = 'Paste base64-encoded model here...';

    const error = document.createElement('div');
    error.style.color = 'red';
    error.style.fontSize = '12px';
    error.style.display = 'none';

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => modal.remove();

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Load Model';
    okBtn.onclick = async () => {
      const val = textarea.value.trim();
      if (!val) {
        error.textContent = 'Please paste a model string.';
        error.style.display = 'block';
        return;
      }
      try {
        await this.useModel(val);
        modal.remove();
      } catch (e) {
        error.textContent = 'Invalid model string.';
        error.style.display = 'block';
      }
    };

    btnRow.append(cancelBtn, okBtn);
    box.append(label, textarea, error, btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);
    textarea.focus();
  }

  @legacyBlock.whenModelMatches(dynamicClassMenu)
  whenModelMatches(state: string) {
    return this.model_match(state);
  }

  @legacyBlock.modelPrediction()
  modelPrediction() {
    return this.getModelPrediction();
  }

  @legacyBlock.modelMatches(dynamicClassMenu)
  modelMatches(state: string) {
    return this.model_match(state);
  }

  @legacyBlock.videoToggle({
    argumentMethods: {
      0: {
        handler: (video_state: string) => {
          return ['on', 'off', 'on-flipped'].includes(video_state) ? video_state : VideoState.ON;
        },
      }
    }
  })
  videoToggle(state: string) {
    this.toggleVideo(state);
  }

  @legacyBlock.setVideoTransparency()
  setVideoTransparency(transparency: number) {
    this.setTransparency(transparency);
  }

}
