import type { NNClassifierModel } from "$lib/nn";
import type { TfjsModelArtifacts } from '../lib/tfjsTypes';

/**
 * Serializes a TensorFlow.js LayersModel to a JSON+weights blob, base64 encoded for export.
 * Returns a Promise that resolves to a base64 string.
 */
export async function exportNNModelToBase64(model: NNClassifierModel): Promise<string> {
    if (!model.weights) throw new Error("Model weights are not loaded");
    // Use tf.io.withSaveHandler to get model JSON and weights as blobs
    // @ts-ignore: tf.LayersModel.save accepts custom IOHandlers
    const saveResult = await model.weights.save({
        save(modelArtifacts: TfjsModelArtifacts) {
            // modelArtifacts: {modelTopology, weightSpecs, weightData}
            const json = JSON.stringify({
                modelTopology: modelArtifacts.modelTopology,
                weightSpecs: modelArtifacts.weightSpecs,
                outputLabels: model.outputLabels
            });
            // Combine JSON and weights as a single object
            const exportObj = {
                json,
                weights: Array.from(new Uint8Array(modelArtifacts.weightData))
            };
            const exportStr = JSON.stringify(exportObj);
            // base64 encode
            return Promise.resolve({
                modelArtifactsInfo: {
                    dateSaved: new Date(),
                    modelTopologyType: 'JSON',
                    modelTopologyBytes: json.length,
                    weightDataBytes: modelArtifacts.weightData.byteLength
                },
                // Not used, but required by tfjs
                modelArtifacts: modelArtifacts,
                // Our custom export
                base64: btoa(unescape(encodeURIComponent(exportStr)))
            });
        }
    });
    // @ts-ignore: base64 is our custom property
    return saveResult.base64;
}

/**
 * Decodes a base64 string and loads a NNClassifierModel from it.
 * Returns a Promise that resolves to a NNClassifierModel.
 */
export async function importNNModelFromBase64(base64: string): Promise<NNClassifierModel> {
    const exportStr = decodeURIComponent(escape(atob(base64)));
    const { json, weights, outputLabels } = JSON.parse(exportStr);
    const modelTopology = JSON.parse(json).modelTopology;
    const weightSpecs = JSON.parse(json).weightSpecs;
    const weightData = new Uint8Array(weights).buffer;
    // @ts-ignore: dynamic import for tfjs
    const tf = await import('@tensorflow/tfjs');
    const loaded = await tf.loadLayersModel({
        load() {
            return Promise.resolve({
                modelTopology,
                weightSpecs,
                weightData
            });
        }
    });
    return {
        outputLabels,
        weights: loaded
    };
}
