import type { PoseDataPoint } from "./types";
import { normalizeSkeletonToHipCenter } from "./mediapipe";

/**
 * Given poseData, duration, recordingStartTime, and chart width,
 * returns an array of sampled skeletons for chart display.
 */
export function getSkeletonPositions({
  poseData,
  duration,
  recordingStartTime,
  actualWidth,
  sampleInterval = 500
}: {
  poseData: PoseDataPoint[];
  duration: number;
  recordingStartTime: number;
  actualWidth: number;
  sampleInterval?: number;
}) {
  if (!poseData || poseData.length === 0) return [];
  const skeletons = [];
  // Use the actual data start time for alignment (if available)
  const dataStartTime = poseData[0]?.timestamp ?? recordingStartTime;
  for (let t = sampleInterval / 2; t < duration; t += sampleInterval) {
    const targetTime = dataStartTime + t;
    let closest = null;
    let minDiff = Infinity;
    for (const pose of poseData) {
      const diff = Math.abs(pose.timestamp - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pose;
      }
    }
    if (closest && minDiff < sampleInterval / 2) {
      const normalized = normalizeSkeletonToHipCenter(closest.landmarks);
      skeletons.push({
        x: (t / duration) * actualWidth,
        landmarks: normalized
      });
    }
  }
  return skeletons;
}
