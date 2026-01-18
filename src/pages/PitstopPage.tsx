import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Button, Chip, Grid, Typography, Alert, CircularProgress, Snackbar } from "@mui/material";
import { motion } from "framer-motion";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageTransition from "../components/PageTransition";
import UploadPanel from "../components/pitstop/UploadPanel";
import JobProgress from "../components/pitstop/JobProgress";
import ResultsPanel from "../components/pitstop/ResultsPanel";
import MetricsPanel from "../components/pitstop/MetricsPanel";
import RunHistoryTable from "../components/pitstop/RunHistoryTable";
import type { PitstopMetrics } from "../components/pitstop/MetricsPanel";
import type { PitstopJob, PitstopJobListItem, UIJobStatus } from "../types/pitstop";
import { mapBackendToUIStatus } from "../types/pitstop";
import { createJob, getJob, getJobs, getOutputUrl, downloadOutput } from "../api/pitstopClient";

const getStatusChipProps = (status: UIJobStatus) => {
  switch (status) {
    case "idle":
      return { label: "Idle", color: "default" as const, bg: "rgba(158, 158, 158, 0.15)" };
    case "uploading":
      return { label: "Uploading", color: "info" as const, bg: "rgba(33, 150, 243, 0.15)" };
    case "queued":
    case "processing":
    case "rendering":
      return { label: "Processing", color: "warning" as const, bg: "rgba(47, 174, 142, 0.15)" };
    case "complete":
      return { label: "Complete", color: "success" as const, bg: "rgba(61, 220, 151, 0.15)" };
    case "failed":
      return { label: "Failed", color: "error" as const, bg: "rgba(244, 67, 54, 0.15)" };
    default:
      return { label: "Unknown", color: "default" as const, bg: "rgba(158, 158, 158, 0.15)" };
  }
};

const POLL_INTERVAL_MS = 1500;

/** Mock metrics data to show when a job is complete (placeholder until API integration) */
const MOCK_METRICS: PitstopMetrics = {
  fuel_time_s: 0.42,
  fl_tyre_time_s: 0.38,
  fr_tyre_time_s: 0.41,
  bl_tyre_time_s: 0.39,
  br_tyre_time_s: 0.40,
  driver_out_time_s: 2.15,
  driver_in_time_s: 2.28,
};

/** Empty metrics (all nulls) */
const EMPTY_METRICS: PitstopMetrics = {
  fuel_time_s: null,
  fl_tyre_time_s: null,
  fr_tyre_time_s: null,
  bl_tyre_time_s: null,
  br_tyre_time_s: null,
  driver_out_time_s: null,
  driver_in_time_s: null,
};

const PitstopPage = () => {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<PitstopJob | null>(null);
  const [status, setStatus] = useState<UIJobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Output state
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  
  // Run history state (real API data with pagination)
  const [runHistory, setRunHistory] = useState<PitstopJobListItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1); // 1-based for UI
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalJobs, setTotalJobs] = useState(0);

  // Refs for polling and UI
  const pollIntervalRef = useRef<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<UIJobStatus>("idle");
  
  // Snackbar state for completion notification
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Fetch run history from API with pagination
  const fetchRunHistory = useCallback(async (pageNum: number, perPage: number) => {
    setIsLoadingHistory(true);
    try {
      const offset = (pageNum - 1) * perPage;
      const response = await getJobs(perPage, offset);
      setRunHistory(response.items);
      setTotalJobs(response.total);
    } catch (err) {
      console.error("Failed to fetch run history:", err);
      // Don't show error for history fetch - non-critical
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch run history when pagination changes
  useEffect(() => {
    fetchRunHistory(page, rowsPerPage);
  }, [fetchRunHistory, page, rowsPerPage]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup blob URLs
  const cleanupBlobUrls = useCallback(() => {
    if (outputBlobUrl) {
      URL.revokeObjectURL(outputBlobUrl);
      setOutputBlobUrl(null);
    }
  }, [outputBlobUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      // Note: outputBlobUrl cleanup handled separately
    };
  }, [stopPolling, fileUrl]);

  // Cleanup outputBlobUrl when it changes
  useEffect(() => {
    return () => {
      if (outputBlobUrl) {
        URL.revokeObjectURL(outputBlobUrl);
      }
    };
  }, [outputBlobUrl]);

  // Show snackbar when job transitions to "complete" and refresh history
  useEffect(() => {
    if (status === "complete" && prevStatusRef.current !== "complete") {
      setSnackbarOpen(true);
      // Reset to page 1 and refresh run history when job completes (newest first)
      setPage(1);
      fetchRunHistory(1, rowsPerPage);
    } else if (status === "failed" && prevStatusRef.current !== "failed") {
      // Also reset to page 1 and refresh history on failure
      setPage(1);
      fetchRunHistory(1, rowsPerPage);
    }
    prevStatusRef.current = status;
  }, [status, fetchRunHistory, rowsPerPage]);

  // Handle snackbar close
  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Handle "View Results" action from snackbar
  const handleViewResults = useCallback(() => {
    setSnackbarOpen(false);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Fetch output video as blob when job completes
  const fetchOutputAsBlob = useCallback(async (id: string) => {
    setIsLoadingOutput(true);
    try {
      const url = getOutputUrl(id);
      console.log("[Pitstop] Fetching output video as blob:", url);
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch output video: ${res.status} ${res.statusText}`);
      }
      
      const blob = await res.blob();
      console.log("[Pitstop] Output blob received:", blob.size, "bytes, type:", blob.type);
      
      // Revoke old blob URL before setting new one
      if (outputBlobUrl) {
        URL.revokeObjectURL(outputBlobUrl);
      }
      
      const blobUrl = URL.createObjectURL(blob);
      console.log("[Pitstop] Created blob URL:", blobUrl);
      setOutputBlobUrl(blobUrl);
      
    } catch (err) {
      console.error("[Pitstop] Error fetching output as blob:", err);
      setError(err instanceof Error ? err.message : "Failed to load output video");
    } finally {
      setIsLoadingOutput(false);
    }
  }, [outputBlobUrl]);

  // Poll for job status
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const jobData = await getJob(id);
      setJob(jobData);
      
      // Update UI status from backend
      const uiStatus = mapBackendToUIStatus(jobData.status, jobData.stage);
      setStatus(uiStatus);
      
      // Update progress
      if (jobData.progress !== undefined) {
        setProgress(jobData.progress * 100);
      }
      
      // Update logs
      if (jobData.logs && jobData.logs.length > 0) {
        setLogs(jobData.logs);
      }
      
      // Check if job is complete or failed
      if (jobData.status === "COMPLETE") {
        setOutputUrl(getOutputUrl(id));
        setProgress(100);
        stopPolling();
        // Fetch output video as blob for reliable playback
        fetchOutputAsBlob(id);
      } else if (jobData.status === "FAILED") {
        setError("Job processing failed. Check logs for details.");
        stopPolling();
      }
    } catch (err) {
      console.error("Error polling job status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch job status");
      stopPolling();
    }
  }, [stopPolling, fetchOutputAsBlob]);

  // Start polling
  const startPolling = useCallback((id: string) => {
    // Initial poll
    pollJobStatus(id);
    
    // Set up interval
    pollIntervalRef.current = window.setInterval(() => {
      pollJobStatus(id);
    }, POLL_INTERVAL_MS);
  }, [pollJobStatus]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    stopPolling();
    cleanupBlobUrls();
    
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFile(selectedFile);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
    } else {
      setFileUrl(null);
    }
    
    // Reset state
    setStatus("idle");
    setProgress(0);
    setLogs([]);
    setOutputUrl(null);
    setJobId(null);
    setJob(null);
    setError(null);
  }, [fileUrl, stopPolling, cleanupBlobUrls]);

  // Run the job
  const runJob = useCallback(async () => {
    if (!file) {
      setError("Please select a video file first.");
      return;
    }

    // Reset state
    cleanupBlobUrls();
    setError(null);
    setLogs([]);
    setProgress(0);
    setOutputUrl(null);
    setJob(null);

    try {
      // Phase 1: Uploading
      setStatus("uploading");
      setLogs(["[INFO] Uploading video to server..."]);

      const response = await createJob(file);
      
      setJobId(response.job_id);
      setJob(response);
      setLogs(prev => [...prev, `[INFO] Job created: ${response.job_id}`]);
      
      // Update status from response
      const uiStatus = mapBackendToUIStatus(response.status, response.stage);
      setStatus(uiStatus);
      
      // Start polling for updates
      startPolling(response.job_id);
      
    } catch (err) {
      console.error("Error creating job:", err);
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to create job");
      setLogs(prev => [...prev, `[ERROR] ${err instanceof Error ? err.message : "Upload failed"}`]);
    }
  }, [file, startPolling, cleanupBlobUrls]);

  // Reset everything
  const handleReset = useCallback(() => {
    stopPolling();
    cleanupBlobUrls();
    
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFile(null);
    setFileUrl(null);
    setStatus("idle");
    setProgress(0);
    setLogs([]);
    setOutputUrl(null);
    setJobId(null);
    setJob(null);
    setError(null);
  }, [fileUrl, stopPolling, cleanupBlobUrls]);

  // Download output
  const handleDownload = useCallback(async () => {
    if (!jobId) return;
    
    try {
      await downloadOutput(jobId, `pitstop_output_${jobId}.mp4`);
    } catch (err) {
      console.error("Error downloading output:", err);
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }, [jobId]);

  // Load a job from history
  const handleLoadJob = useCallback(async (historyJob: PitstopJobListItem) => {
    console.log("handleLoadJob CALLED", historyJob.job_id, { status: historyJob.status, has_output: historyJob.has_output });
    
    if (historyJob.status !== "COMPLETE" || !historyJob.has_output) {
      console.log("handleLoadJob SKIPPED - job not complete or no output");
      return; // Can only load complete jobs with output
    }
    
    setLoadingJobId(historyJob.job_id);
    stopPolling();
    cleanupBlobUrls();
    
    try {
      // Fetch full job details
      const fullJob = await getJob(historyJob.job_id);
      
      // Update state with loaded job
      setFile(null);
      setFileUrl(null); // We don't have the input file URL for history jobs
      setJobId(historyJob.job_id);
      setJob(fullJob);
      setStatus(mapBackendToUIStatus(fullJob.status, fullJob.stage));
      setProgress(fullJob.progress !== undefined ? fullJob.progress * 100 : 100);
      setLogs(fullJob.logs || ["[INFO] Loaded from run history"]);
      setOutputUrl(getOutputUrl(historyJob.job_id));
      setError(null);
      
      // Fetch output video as blob
      await fetchOutputAsBlob(historyJob.job_id);
      
    } catch (err) {
      console.error("Error loading job from history:", err);
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setLoadingJobId(null);
    }
  }, [stopPolling, cleanupBlobUrls, fetchOutputAsBlob]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1); // Reset to first page when changing rows per page
  }, []);

  // Computed values
  const statusChip = getStatusChipProps(status);
  const isRunning = ["uploading", "queued", "processing", "rendering"].includes(status);
  const canRun = file !== null && !isRunning;

  // Use blob URL for playback if available, otherwise fall back to direct URL
  const videoPlaybackUrl = outputBlobUrl || outputUrl;

  return (
    <PageTransition>
      <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 4,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                Pitstop
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Upload race footage. Generate pitstop analysis video.
              </Typography>
            </Box>
            <Chip
              label={statusChip.label}
              sx={{
                backgroundColor: statusChip.bg,
                fontWeight: 600,
                px: 1,
              }}
            />
          </Box>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </motion.div>
        )}

        {/* Top Row: Upload + Progress - Equal Height */}
        <Grid 
          container 
          spacing={3} 
          alignItems="stretch"
          sx={{ minHeight: { md: 520 } }}
        >
          {/* Left: Upload Card */}
          <Grid item xs={12} md={5} sx={{ display: "flex" }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ display: "flex", width: "100%", flex: 1 }}
            >
              <UploadPanel
                file={file}
                onFileSelect={handleFileSelect}
                disabled={isRunning}
              />
            </motion.div>
          </Grid>

          {/* Right: Progress Card */}
          <Grid item xs={12} md={7} sx={{ display: "flex" }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ display: "flex", width: "100%", flex: 1 }}
            >
              <JobProgress 
                status={status} 
                progress={progress} 
                logs={logs}
                stage={job?.stage}
              />
            </motion.div>
          </Grid>
        </Grid>

        {/* Job Controls */}
        <Box sx={{ mt: 3 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={runJob}
                disabled={!canRun}
                sx={{
                  px: 4,
                  py: 1.2,
                  background: canRun
                    ? "linear-gradient(135deg, #004225 0%, #002D1A 100%)"
                    : undefined,
                  border: canRun ? "1px solid rgba(47, 174, 142, 0.3)" : undefined,
                  boxShadow: canRun ? "0 4px 16px rgba(0, 66, 37, 0.25)" : undefined,
                }}
              >
                {isRunning ? "Running..." : "Run Pitstop Model"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={isRunning}
              >
                Reset
              </Button>
            </Box>
          </motion.div>
        </Box>

        {/* Rest of the content */}
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {/* Results Panel - Full Width */}
          <Grid item xs={12} ref={resultsRef}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <ResultsPanel
                inputUrl={fileUrl}
                outputUrl={videoPlaybackUrl}
                outputDownloadUrl={outputUrl}
                jobId={jobId}
                onDownload={handleDownload}
                isRealOutput={jobId !== null && status === "complete"}
                isLoadingOutput={isLoadingOutput}
              />
            </motion.div>
          </Grid>

          {/* Metrics Section - Full Width */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <MetricsPanel
                metrics={status === "complete" ? MOCK_METRICS : EMPTY_METRICS}
                status={status}
              />
            </motion.div>
          </Grid>

          {/* Run History - Full Width */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <RunHistoryTable 
                jobs={runHistory} 
                onLoadJob={handleLoadJob}
                loadingJobId={loadingJobId}
                isLoading={isLoadingHistory}
                page={page}
                rowsPerPage={rowsPerPage}
                totalJobs={totalJobs}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            </motion.div>
          </Grid>
        </Grid>
      </Box>

      {/* Completion notification snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={handleSnackbarClose}
        message="Output ready"
        action={
          <Button 
            color="secondary" 
            size="small" 
            onClick={handleViewResults}
            sx={{ fontWeight: 600 }}
          >
            View Results
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            backgroundColor: "rgba(0, 66, 37, 0.95)",
            border: "1px solid rgba(47, 174, 142, 0.3)",
          },
        }}
      />
    </PageTransition>
  );
};

export default PitstopPage;
