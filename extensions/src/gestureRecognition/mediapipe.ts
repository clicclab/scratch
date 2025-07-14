// MediaPipe pose detection utilities for real-time video analysis
import { PoseLandmarker, FilesetResolver, DrawingUtils, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { Vector3 } from './types';
import { landmarkMap } from './poseLandmarks';

export class MediaPipePoseDetector {
    private poseLandmarker: PoseLandmarker | null = null;
    private isInitialized = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
            );
            
            this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numPoses: 1
            });
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize MediaPipe pose detector:', error);
            throw error;
        }
    }

    /**
     * Detect pose landmarks from a video element at the current time
     * Returns normalized coordinates (0-1) relative to the video frame
     */
    detectPose(videoElement: HTMLVideoElement): {landmarks: Vector3[], videoLandmarks: Vector3[]} | null {
        if (!this.poseLandmarker || !this.isInitialized) {
            return null;
        }

        try {
            const results = this.poseLandmarker.detectForVideo(videoElement, performance.now());
            
            if (results.landmarks && results.landmarks.length > 0) {
                // Convert MediaPipe landmarks to our Vector3 format
                // MediaPipe returns normalized coordinates (0-1) for x and y
                return {
                    landmarks: results.worldLandmarks[0].map(landmark => ({
                        x: landmark.x, // normalized (0-1) relative to video width
                        y: landmark.y, // normalized (0-1) relative to video height  
                        z: landmark.z  // relative depth
                    })),
                    videoLandmarks: results.landmarks[0].map(landmark => ({
                        x: landmark.x, // normalized (0-1) relative to video width
                        y: landmark.y, // normalized (0-1) relative to video height  
                        z: landmark.z  // relative depth
                    }))
                };
            }
        } catch (error) {
            console.error('Error detecting pose:', error);
        }

        return null;
    }

    destroy(): void {
        if (this.poseLandmarker) {
            this.poseLandmarker.close();
            this.poseLandmarker = null;
        }
        this.isInitialized = false;
    }
}

/**
 * Convert normalized MediaPipe coordinates to pixel coordinates
 * for overlaying on a video element
 */
export function convertToPixelCoordinates(
    landmarks: Vector3[], 
    videoElement: HTMLVideoElement
): Vector3[] {
    const rect = videoElement.getBoundingClientRect();
    
    return landmarks.map(landmark => ({
        x: landmark.x * rect.width,   // Convert normalized x to pixels
        y: landmark.y * rect.height,  // Convert normalized y to pixels
        z: landmark.z                 // Keep relative depth as-is
    }));
}

/**
 * Normalize a world-space skeleton so the midpoint between left and right hips is at the origin.
 * Returns a new array of Vector3 with the same order as input.
 * If hip landmarks are missing, returns the original array.
 */
export function normalizeSkeletonToHipCenter(landmarks: Vector3[]): Vector3[] {
    const leftHipIdx = landmarkMap.leftHip;
    const rightHipIdx = landmarkMap.rightHip;
    const leftHip = landmarks[leftHipIdx];
    const rightHip = landmarks[rightHipIdx];
    
    if (!leftHip || !rightHip) {
        console.warn("Missing hip landmarks, returning original landmarks");
        return landmarks;
    }

    const center = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
        z: (leftHip.z + rightHip.z) / 2
    };

    return landmarks.map(lm => ({
        x: lm.x - center.x,
        y: lm.y - center.y,
        z: lm.z - center.z
    }));
}

/**
 * Create a reusable MediaPipe detector instance
 */
let globalDetector: MediaPipePoseDetector | null = null;

export async function getGlobalPoseDetector(): Promise<MediaPipePoseDetector> {
    if (!globalDetector) {
        globalDetector = new MediaPipePoseDetector();
        await globalDetector.initialize();
    }
    return globalDetector;
}

export function cleanupGlobalDetector(): void {
    if (globalDetector) {
        globalDetector.destroy();
        globalDetector = null;
    }
}

export function drawPoseLandmarks(poseCanvas: HTMLCanvasElement, videoElement: HTMLVideoElement, landmarks: NormalizedLandmark[]) {
        if (!poseCanvas || !videoElement) return;
        const ctx = poseCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);

        // Ensure canvas matches video display size for correct scaling
        const videoRect = videoElement.getBoundingClientRect();
        poseCanvas.width = videoRect.width;
        poseCanvas.height = videoRect.height;

        // Use DrawingUtils from @mediapipe/tasks-vision to draw skeleton
        const drawingUtils = new DrawingUtils(ctx);
        // DrawingUtils expects landmarks in normalized coordinates (0-1)
        // and draws on the canvas sized to the video
        drawingUtils.drawLandmarks(landmarks, {
            color: '#00FF00',
            radius: 2,
        });

        drawingUtils.drawConnectors(landmarks, 
            PoseLandmarker.POSE_CONNECTIONS,    
        {
            lineWidth: 2,
            color: '#00BF22',
        });
    }