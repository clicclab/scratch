import { Environment, extension, legacy } from "$common";
import * as tf from '@tensorflow/tfjs';
import { legacyFullSupport } from "./legacy";

const { legacyBlock, legacyExtension } = legacyFullSupport.for<BballDetect>();

// Constants
const modelUrl = './static/models/tf-bballDetect/model.json';
const VideoState = { OFF: 'off', ON: 'on', ON_FLIPPED: 'on-flipped' } as const;
const Detection = { OFF: 'off', ON: 'on' } as const;
const Visibility = { SHOW: 'show', HIDE: 'hide' } as const;
const Objects = { BASKETBALL: 'basketballs', RIM: 'rims' } as const;
const Object = { BASKETBALL: 'basketball', RIM: 'rim' } as const;
const Axis = { X: 'x', Y: 'y' } as const;
const Event = { PASS: 'pass' } as const;

@legacyExtension()
export default class BballDetect extends extension({
  name: "Sport Finder",
  tags: ["Made by PRG"]
}) {
  // --- Class Properties ---
  model: tf.GraphModel<string | tf.io.IOHandler>;
  detections: any[] = [];
  globalDetectionRate: number = 1;
  globalDetection: string = Detection.ON;
  currImage: ImageData;
  skinID: number = -1;
  potentialPass: any = null;
  readonly DIMENSIONS = [480, 360];

  async init(env: Environment) {
    console.log("Initializing Sport Finder extension...");
    await this.loadModel();

    // Set initial state
    console.log(this);
    this.runtime.ioDevices.video.enableVideo();
    this.runtime.ioDevices.video.mirror = true;
    this.runtime.ioDevices.video.setPreviewGhost(50);
    this.globalDetection = Detection.ON;
    this.globalDetectionRate = 1;

    // Start the detection loop
    console.log("Starting detection loop...");
    this._loop();
  }

  async _loop() {
    const frame = this.runtime.ioDevices.video.getFrame({
      format: 'image-data',
      dimensions: this.DIMENSIONS
    });

    if (frame) {
      this.currImage = frame;
      await this.generatePrediction();
    } else {
      this.detections = [];
    }

    // Schedule the next loop iteration
    setTimeout(() => this._loop(), this.globalDetectionRate);
  }

  async loadModel() {
    this.model = await tf.loadGraphModel(modelUrl);
    console.log("Sport Finder model loaded.");
  }

  async generatePrediction() {
    if (!this.model || this.globalDetection !== Detection.ON || !this.currImage) {
      return;
    }

    const resultTensors = tf.tidy(() => {
      let img = tf.browser.fromPixels(this.currImage).resizeBilinear([128, 128]).div(255.0).expandDims(0);
      return this.model.predict(img) as tf.Tensor;
    });

    const scores_max = resultTensors.max(3);
    const scores_maxClass = resultTensors.argMax(3);
    const scoresMaxArray = await scores_max.data();
    const scoresMaxClassArray = await scores_maxClass.data();

    this.detections = [];
    for (let i = 0; i < scoresMaxArray.length; i++) {
      if (scoresMaxArray[i] >= 0.25) {
        if (scoresMaxClassArray[i] === 1) { // 1 is basketball
          this.detections.push({ class: "Basketball", score: scoresMaxArray[i].toFixed(2), position: i });
        } else if (scoresMaxClassArray[i] === 2) { // 2 is rim
          this.detections.push({ class: "Rim", score: scoresMaxArray[i].toFixed(2), position: i });
        }
      }
    }

    scores_max.dispose();
    scores_maxClass.dispose();
    resultTensors.dispose();
  }

  // --- Block Implementations ---

  @legacyBlock.setContinuousDetection()
  setContinuousDetection(DETECTION: string) {
    this.globalDetection = DETECTION;
  }

  @legacyBlock.setPassLineVisibility()
  setPassLineVisibility(VISIBILITY: string) {
    // Note: Direct renderer access like in Scratch is different here.
    // This is a best-effort conversion. You may need to use a pen-based sprite
    // to draw these lines in the PRG Playground.
    const renderer = this.runtime.renderer;
    if (!renderer) return;

    if (this.skinID < 0) this.skinID = renderer.createPenSkin();

    renderer.penClear(this.skinID); // Clear previous lines

    if (VISIBILITY === Visibility.SHOW) {
      const lineProps = { color4f: [78 / 255, 42 / 255, 132 / 255, 1], diameter: 3 };
      // Middle line
      renderer.penLine(this.skinID, lineProps, 0, renderer._yTop, 0, renderer._yBottom);
      // Left line
      renderer.penLine(this.skinID, lineProps, renderer._xLeft + 20, 180, renderer._xLeft + 20, -180);
      // Right line
      renderer.penLine(this.skinID, lineProps, renderer._xRight - 20, 180, renderer._xRight - 20, -180);
    }
    this.runtime.requestRedraw();
  }
  
  @legacyBlock.goToNearestObject()
  goToNearestObject(OBJECT: string) {
    const nearest = this.nearestHelper(OBJECT);
    if (nearest) {
      this.util.target.setXY(nearest.x, nearest.y);
    }
  }
  
  @legacyBlock.setDetectionRate()
  setDetectionRate(RATE: number) {
    this.globalDetectionRate = Math.max(1, RATE); // Ensure rate is at least 1ms
  }

  @legacyBlock.clearAllDetections()
  clearAllDetections() {
    this.detections = [];
  }

  @legacyBlock.ifEvent()
  ifEvent(EVENT: string): boolean {
    if (EVENT === Event.PASS) {
      return this.isPassDetected();
    }
    return this.filterDetections(EVENT).length > 0;
  }

  @legacyBlock.currObjs()
  currObjs(OBJECTS: string): string {
    const objects = this.filterDetections(OBJECTS);
    if (objects.length > 0) {
      return objects.map(obj => {
        const { x, y } = this.tfPositiontoScratch(obj.position);
        return `${obj.class}, ${obj.score}, (${x}, ${y})`;
      }).join('\n');
    }
    return `No ${OBJECTS} found!`;
  }

  @legacyBlock.numDetected()
  numDetected(OBJECTS: string): number {
    return this.filterDetections(OBJECTS).length;
  }

  @legacyBlock.objectsPos()
  objectsPos(AXIS: string, OBJECTS: string): string {
    const objects = this.filterDetections(OBJECTS);
    if (objects.length > 0) {
      const key = AXIS === Axis.X ? 'x' : 'y';
      return objects.map(obj => this.tfPositiontoScratch(obj.position)[key]).join('\n');
    }
    return `No ${OBJECTS} found!`;
  }

  @legacyBlock.nearestCoords()
  nearestCoords(OBJECT: string): string {
    const nearest = this.nearestHelper(OBJECT);
    return nearest ? `(${nearest.x}, ${nearest.y})` : `No ${OBJECT}s found!`;
  }
  
  @legacyBlock.nearestPos()
  nearestPos(AXIS: string, OBJECT: string): string | number {
    const nearest = this.nearestHelper(OBJECT);
    if (nearest) {
      return AXIS === Axis.X ? nearest.x : nearest.y;
    }
    return `No ${OBJECT}s found!`;
  }

  @legacyBlock.objDist()
  objDist(OBJECT1: string, OBJECT2: string): number {
    const nearest1 = this.nearestHelper(OBJECT1);
    const nearest2 = this.nearestHelper(OBJECT2);
    if (nearest1 && nearest2) {
      const dist = Math.sqrt(Math.pow(nearest1.x - nearest2.x, 2) + Math.pow(nearest1.y - nearest2.y, 2));
      return parseFloat(dist.toFixed(2));
    }
    return 0;
  }
  
  @legacyBlock.objAngle()
  objAngle(OBJECT1: string, OBJECT2: string): string {
    const nearest1 = this.nearestHelper(OBJECT1);
    const nearest2 = this.nearestHelper(OBJECT2);
    if (nearest1 && nearest2) {
      let angle = Math.abs(Math.atan2(nearest2.y - nearest1.y, nearest2.x - nearest1.x) * (180 / Math.PI));
      if (angle > 180) angle -= 180;
      return `${angle.toFixed(2)}\u00B0`;
    }
    return "0";
  }

  @legacyBlock.videoToggle()
  videoToggle(VIDEO_STATE: string) {
    if (VIDEO_STATE === VideoState.OFF) {
      this.runtime.ioDevices.video.disableVideo();
    } else {
      this.runtime.ioDevices.video.enableVideo();
      this.runtime.ioDevices.video.mirror = (VIDEO_STATE === VideoState.ON);
    }
  }
  
  @legacyBlock.setVideoTransparency()
  setVideoTransparency(TRANSPARENCY: number) {
    const trans = Math.max(0, Math.min(100, TRANSPARENCY));
    this.runtime.ioDevices.video.setPreviewGhost(trans);
  }
  
  // --- Helper Methods ---

  isPassDetected(): boolean {
    const basketballs = this.filterDetections(Objects.BASKETBALL);
    if (basketballs.length === 0) return false;
    
    const xLeft = -240 + 50; // Stage left bound with leeway
    const xRight = 240 - 50; // Stage right bound with leeway

    for (const bball of basketballs) {
      const x = this.tfPositiontoScratch(bball.position).x;
      if (x <= xLeft || x >= xRight) {
        if (!this.potentialPass) {
          this.potentialPass = { startTime: Date.now(), direction: x <= xLeft ? 'left-to-right' : 'right-to-left' };
        } else {
          const timeDiff = Date.now() - this.potentialPass.startTime;
          if (timeDiff <= 2000) { // 2 second window for a pass
            if ((this.potentialPass.direction === 'left-to-right' && x >= xRight) || (this.potentialPass.direction === 'right-to-left' && x <= xLeft)) {
              this.potentialPass = null;
              return true;
            }
          } else {
            this.potentialPass = null; // Reset after timeout
          }
        }
      }
    }
    return false;
  }
  
  tfPositiontoScratch(position: number): { x: number, y: number } {
    const column = position % 16;
    const row = Math.floor(position / 16);
    const x = (column * 30) - 240 + 15;
    const y = 180 - (row * 22.5) - 11.25;
    return { x: Math.round(x), y: Math.round(y) };
  }

  filterDetections(type: string): any[] {
    if (type === Object.BASKETBALL || type === Objects.BASKETBALL) {
      return this.detections.filter(d => d.class === "Basketball");
    }
    if (type === Object.RIM || type === Objects.RIM) {
      return this.detections.filter(d => d.class === "Rim");
    }
    return this.detections;
  }
  
  nearestHelper(type: string): { x: number, y: number } | null {
    const objects = this.filterDetections(type);
    if (objects.length === 0) return null;

    let nearestDetection = null;
    let minDistanceSq = Infinity;
    
    const spriteX = this.util.target.x;
    const spriteY = this.util.target.y;

    for (const obj of objects) {
      const { x, y } = this.tfPositiontoScratch(obj.position);
      const distanceSq = Math.pow(x - spriteX, 2) + Math.pow(y - spriteY, 2);

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        nearestDetection = { x, y };
      }
    }
    return nearestDetection;
  }
}