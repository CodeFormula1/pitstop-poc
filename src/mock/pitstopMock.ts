// Re-export UIJobStatus as JobStatus for backward compatibility
import type { UIJobStatus } from "../types/pitstop";
export type JobStatus = UIJobStatus;

export interface PitstopRun {
  id: string;
  dateTime: string;
  race: string;
  status: JobStatus;
  inputFilename: string;
  outputUrl: string | null;
  inputUrl: string | null;
}

export const mockPitstopRuns: PitstopRun[] = [
  {
    id: "PST-001",
    dateTime: "2026-01-15 14:32:11",
    race: "Bahrain GP",
    status: "complete",
    inputFilename: "bahrain_race_footage.mp4",
    outputUrl: "/media/mock-output.mp4",
    inputUrl: "/media/mock-input.mp4",
  },
  {
    id: "PST-002",
    dateTime: "2026-01-14 09:18:45",
    race: "Saudi Arabian GP",
    status: "complete",
    inputFilename: "saudi_pitstop_clip.mov",
    outputUrl: "/media/mock-output.mp4",
    inputUrl: "/media/mock-input.mp4",
  },
  {
    id: "PST-003",
    dateTime: "2026-01-12 16:55:02",
    race: "Australian GP",
    status: "failed",
    inputFilename: "melbourne_stint2.mkv",
    outputUrl: null,
    inputUrl: "/media/mock-input.mp4",
  },
];

export const mockLogLines = [
  "[INFO] Initializing pitstop detection model...",
  "[INFO] Loading pre-trained weights from checkpoint v3.2.1",
  "[INFO] GPU detected: NVIDIA A100 40GB",
  "[INFO] Allocating VRAM for inference pipeline...",
  "[PROC] Starting frame extraction at 60fps...",
  "[PROC] Extracted 3,420 frames from input video",
  "[PROC] Running object detection pass 1/3...",
  "[PROC] Detected 847 pitstop-relevant objects",
  "[PROC] Running tracking algorithm...",
  "[PROC] Wheel change events detected: 4",
  "[PROC] Calculating tire compound predictions...",
  "[PROC] Running object detection pass 2/3...",
  "[PROC] Running object detection pass 3/3...",
  "[PROC] Aggregating detection confidence scores...",
  "[RENDER] Initializing output video encoder...",
  "[RENDER] Applying overlay annotations...",
  "[RENDER] Encoding frame 1000/3420...",
  "[RENDER] Encoding frame 2000/3420...",
  "[RENDER] Encoding frame 3420/3420...",
  "[DONE] Output video ready. Total time: 6.2s",
];

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const generateRunId = (): string => {
  const num = Math.floor(Math.random() * 900) + 100;
  return `PST-${num}`;
};

export const getCurrentDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

