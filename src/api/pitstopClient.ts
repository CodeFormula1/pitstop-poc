/**
 * Pitstop API client for communicating with the FastAPI backend.
 */
import type { 
  PitstopJob, 
  JobMetadata, 
  CreateJobResponse,
  PitstopJobListResponse,
} from "../types/pitstop";

/** Base URL for the Pitstop API - configurable via env */
export const PITSTOP_API_BASE = 
  import.meta.env.VITE_PITSTOP_API_BASE ?? "http://localhost:8000";

/**
 * Create a new pitstop job by uploading a video file.
 * 
 * @param file - The video file to upload
 * @param meta - Optional metadata (series, race, notes)
 * @returns The created job response containing job_id
 */
export async function createJob(
  file: File,
  meta?: JobMetadata
): Promise<CreateJobResponse> {
  const formData = new FormData();
  formData.append("file", file);
  
  if (meta?.series) formData.append("series", meta.series);
  if (meta?.race) formData.append("race", meta.race);
  if (meta?.notes) formData.append("notes", meta.notes);

  const response = await fetch(`${PITSTOP_API_BASE}/api/pitstop/jobs`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Upload failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get the current status of a job.
 * 
 * @param jobId - The job ID to fetch
 * @returns The job status and details
 */
export async function getJob(jobId: string): Promise<PitstopJob> {
  const response = await fetch(`${PITSTOP_API_BASE}/api/pitstop/jobs/${jobId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch job: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get list of recent pitstop jobs with pagination.
 * 
 * @param limit - Maximum number of jobs to fetch (default 20)
 * @param offset - Number of jobs to skip (default 0)
 * @returns List of jobs and total count
 */
export async function getJobs(
  limit: number = 20,
  offset: number = 0
): Promise<PitstopJobListResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  const response = await fetch(
    `${PITSTOP_API_BASE}/api/pitstop/jobs?${params}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch jobs: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get the URL to download/stream the output video.
 * 
 * @param jobId - The job ID
 * @returns The URL to the output video endpoint
 */
export function getOutputUrl(jobId: string): string {
  return `${PITSTOP_API_BASE}/api/pitstop/jobs/${jobId}/output`;
}

/**
 * Download the output video as a blob and trigger browser download.
 * 
 * @param jobId - The job ID
 * @param filename - The filename for the download
 */
export async function downloadOutput(jobId: string, filename?: string): Promise<void> {
  const url = getOutputUrl(jobId);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename || `pitstop_output_${jobId}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * Delete a job and its associated files.
 * 
 * @param jobId - The job ID to delete
 */
export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`${PITSTOP_API_BASE}/api/pitstop/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Delete failed: ${response.status} ${response.statusText}`
    );
  }
}

