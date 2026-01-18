/**
 * Type definitions for Pitstop API responses.
 */

/** Backend job status values */
export type PitstopJobStatus = "QUEUED" | "PROCESSING" | "COMPLETE" | "FAILED";

/** Backend processing stages */
export type PitstopStage = 
  | "UPLOAD" 
  | "DETECTING" 
  | "TRACKING" 
  | "RENDERING" 
  | "COMPLETE" 
  | "FAILED";

/** Output file metadata from backend */
export interface PitstopOutput {
  available: boolean;
  filename?: string | null;
  size_bytes?: number | null;
}

/** Full job response from GET /api/pitstop/jobs/{job_id} */
export interface PitstopJob {
  job_id: string;
  status: PitstopJobStatus;
  stage?: string;
  progress?: number;
  series?: string | null;
  race?: string | null;
  notes?: string | null;
  input_filename?: string;
  input_size_bytes?: number;
  logs?: string[];
  output?: PitstopOutput;
  created_at?: string;
  updated_at?: string;
}

/** Response from POST /api/pitstop/jobs */
export interface CreateJobResponse extends PitstopJob {}

/** Metadata for job creation */
export interface JobMetadata {
  series?: string;
  race?: string;
  notes?: string;
}

/** Lightweight job item for list endpoint (GET /api/pitstop/jobs) */
export interface PitstopJobListItem {
  job_id: string;
  status: PitstopJobStatus;
  stage: string;
  progress: number;
  series?: string | null;
  race?: string | null;
  input_filename: string;
  input_size_bytes: number;
  has_output: boolean;
  created_at: string;
  updated_at: string;
}

/** Response from GET /api/pitstop/jobs with pagination metadata */
export interface PitstopJobListResponse {
  items: PitstopJobListItem[];
  total: number;
  limit: number;
  offset: number;
}

/** Timing metrics for a pitstop job from GET /api/pitstop/jobs/{job_id}/metrics */
export interface PitstopRunMetrics {
  job_id: string;
  fuel_time_s: number | null;
  front_left_tyre_time_s: number | null;
  front_right_tyre_time_s: number | null;
  back_left_tyre_time_s: number | null;
  back_right_tyre_time_s: number | null;
  driver_out_time_s: number | null;
  driver_in_time_s: number | null;
}

/** UI-level job status (combines backend status with upload phase) */
export type UIJobStatus = 
  | "idle" 
  | "uploading" 
  | "queued" 
  | "processing" 
  | "rendering" 
  | "complete" 
  | "failed";

/**
 * Map backend status + stage to UI status.
 */
export function mapBackendToUIStatus(
  status: PitstopJobStatus | undefined,
  stage: string | undefined
): UIJobStatus {
  if (!status) return "idle";
  
  switch (status) {
    case "QUEUED":
      return "queued";
    case "PROCESSING":
      // Map stage to more granular UI status
      if (stage === "RENDERING") return "rendering";
      return "processing";
    case "COMPLETE":
      return "complete";
    case "FAILED":
      return "failed";
    default:
      return "idle";
  }
}

/**
 * Get the active step index for the stepper based on backend status/stage.
 * Steps: Upload(0), Queued(1), Processing(2), Rendering(3), Complete(4)
 */
export function getStepFromBackend(
  status: PitstopJobStatus | undefined,
  stage: string | undefined
): number {
  if (!status) return -1;
  
  switch (status) {
    case "QUEUED":
      if (stage === "UPLOAD") return 0;
      return 1;
    case "PROCESSING":
      if (stage === "DETECTING" || stage === "TRACKING") return 2;
      if (stage === "RENDERING") return 3;
      return 2;
    case "COMPLETE":
      return 5; // Past the last step to show all complete
    case "FAILED":
      return -1;
    default:
      return -1;
  }
}

