// Shared type for model selection
export type ModelType = "neural" | "knn";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type AccelerometerDataPoint = Vector3 & {
  timestamp: number;
};

export type PoseDataPoint = {
    // World coordinates of the pose landmarks
	landmarks: Vector3[];
	// Video coordinates of the pose landmarks (normalized to video dimensions)
	videoLandmarks: Vector3[];
	// Timestamp of the data point
    timestamp: number;
};

export type LabeledRecording = {
	recordingStartTime: number;
	t0: number;
	t1: number;
	label: string;
};

export type Recording = {
	id: string;
	startTime: number;
	endTime: number;
	videoBlob: Blob;
	sensorData: Array<AccelerometerDataPoint> | Array<PoseDataPoint>;
	duration: number;
};

export type RecordingType = "accelerometer" | "pose";

// Function to determine the type of recording based on its sensor data
export function getRecordingType(recording: Recording): RecordingType | null {
	if (recording.sensorData.length === 0) return null;
	if ("landmarks" in recording.sensorData[0]) return "pose";
    // Accelerometer data points don't have a unique identifier like "landmarks", but they do have a "timestamp" field and "x", "y", "z" coordinates
	if ("timestamp" in recording.sensorData[0] && "x" in recording.sensorData[0] && "y" in recording.sensorData[0] && "z" in recording.sensorData[0]) return "accelerometer";
	return null;
}