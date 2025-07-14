// Minimal type for TensorFlow.js ModelArtifacts
export type TfjsModelArtifacts = {
  modelTopology: any;
  weightSpecs: any;
  weightData: ArrayBuffer;
};
