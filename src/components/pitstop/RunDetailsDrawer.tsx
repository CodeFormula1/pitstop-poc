import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import DonutSmallOutlinedIcon from "@mui/icons-material/DonutSmallOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import AdjustOutlinedIcon from "@mui/icons-material/AdjustOutlined";
import RadioButtonCheckedOutlinedIcon from "@mui/icons-material/RadioButtonCheckedOutlined";
import type { PitstopJob, PitstopJobStatus, PitstopRunMetrics } from "../../types/pitstop";
import { getJob, getOutputUrl, downloadOutput, getJobMetrics } from "../../api/pitstopClient";

interface RunDetailsDrawerProps {
  open: boolean;
  runId: string | null;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ display: value === index ? "block" : "none" }}
  >
    {value === index && children}
  </Box>
);

const getStatusColor = (status: PitstopJobStatus) => {
  switch (status) {
    case "COMPLETE":
      return { bg: "rgba(61, 220, 151, 0.15)", color: "#3DDC97", label: "Complete" };
    case "FAILED":
      return { bg: "rgba(244, 67, 54, 0.15)", color: "#f44336", label: "Failed" };
    case "PROCESSING":
      return { bg: "rgba(47, 174, 142, 0.15)", color: "#2FAE8E", label: "Processing" };
    case "QUEUED":
      return { bg: "rgba(255, 255, 255, 0.1)", color: "#9BB7A8", label: "Queued" };
    default:
      return { bg: "rgba(255, 255, 255, 0.1)", color: "#9BB7A8", label: status };
  }
};

const formatDateTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const formatBytes = (bytes: number | undefined): string => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Metric card component for drawer metrics tab */
interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
  icon?: React.ReactNode;
  positionPill?: string;
}

const MetricCard = ({ label, value, unit = "s", icon, positionPill }: MetricCardProps) => {
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? value.toFixed(2) : "—";

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: "1px solid rgba(255, 255, 255, 0.07)",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s ease",
        minHeight: 85,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        "&:hover": {
          borderColor: "rgba(47, 174, 142, 0.3)",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      {/* Icon + Label + Position Pill row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
        {icon && (
          <Box
            sx={{
              color: hasValue ? "rgba(47, 174, 142, 0.6)" : "rgba(155, 183, 168, 0.3)",
              display: "flex",
              alignItems: "center",
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            flex: 1,
          }}
        >
          {label}
        </Typography>
        {positionPill && (
          <Chip
            label={positionPill}
            size="small"
            sx={{
              height: 16,
              fontSize: "0.6rem",
              fontWeight: 700,
              backgroundColor: "rgba(47, 174, 142, 0.15)",
              color: "secondary.main",
              border: "1px solid rgba(47, 174, 142, 0.3)",
              "& .MuiChip-label": {
                px: 0.5,
              },
            }}
          />
        )}
      </Box>

      {/* Value */}
      <Box sx={{ display: "flex", alignItems: "baseline" }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: hasValue ? "secondary.main" : "text.disabled",
            lineHeight: 1,
          }}
        >
          {displayValue}
        </Typography>
        {hasValue && (
          <Typography
            variant="body2"
            sx={{
              color: "secondary.main",
              ml: 0.5,
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const RunDetailsDrawer = ({ open, runId, onClose }: RunDetailsDrawerProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Job state
  const [job, setJob] = useState<PitstopJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  
  // Metrics state
  const [metrics, setMetrics] = useState<PitstopRunMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Reset tab to Video when runId changes
  useEffect(() => {
    if (runId) {
      setActiveTab(0);
    }
  }, [runId]);

  // Fetch job details AND metrics when drawer opens with a runId
  useEffect(() => {
    if (!open || !runId) {
      setJob(null);
      setError(null);
      setMetrics(null);
      setMetricsError(null);
      return;
    }

    const fetchJobDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const jobData = await getJob(runId);
        setJob(jobData);
        
        // If job is complete and has output, fetch the video blob
        if (jobData.status === "COMPLETE" && jobData.output?.available) {
          setIsLoadingVideo(true);
          try {
            const url = getOutputUrl(runId);
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              setOutputBlobUrl(blobUrl);
            }
          } catch (err) {
            console.error("Failed to load video:", err);
          } finally {
            setIsLoadingVideo(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch job details:", err);
        setError(err instanceof Error ? err.message : "Failed to load run details");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMetrics = async () => {
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const metricsData = await getJobMetrics(runId);
        setMetrics(metricsData);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
        setMetricsError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setMetricsLoading(false);
      }
    };

    // Fetch both job details and metrics in parallel when drawer opens
    fetchJobDetails();
    fetchMetrics();
  }, [open, runId]);

  // Cleanup blob URL when drawer closes or runId changes
  useEffect(() => {
    return () => {
      if (outputBlobUrl) {
        URL.revokeObjectURL(outputBlobUrl);
      }
    };
  }, [outputBlobUrl]);

  // Reset blob URL when drawer closes
  useEffect(() => {
    if (!open) {
      if (outputBlobUrl) {
        URL.revokeObjectURL(outputBlobUrl);
        setOutputBlobUrl(null);
      }
    }
  }, [open, outputBlobUrl]);

  const handleDownload = useCallback(async () => {
    if (!runId) return;
    try {
      await downloadOutput(runId, `pitstop_output_${runId}.mp4`);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [runId]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const statusStyle = job ? getStatusColor(job.status) : null;
  const outputUrl = runId ? getOutputUrl(runId) : null;

  // Check if metrics has any non-null values
  const hasAnyMetric = metrics && (
    metrics.fuel_time_s !== null ||
    metrics.front_left_tyre_time_s !== null ||
    metrics.front_right_tyre_time_s !== null ||
    metrics.back_left_tyre_time_s !== null ||
    metrics.back_right_tyre_time_s !== null ||
    metrics.driver_out_time_s !== null ||
    metrics.driver_in_time_s !== null
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 10,
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: 520 },
          backgroundColor: "rgba(11, 15, 12, 0.98)",
          borderLeft: "1px solid rgba(47, 174, 142, 0.2)",
          backdropFilter: "blur(12px)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Run Details
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={40} color="secondary" />
            <Typography color="text.secondary">Loading run details...</Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              py: 8,
              textAlign: "center",
              px: 2.5,
            }}
          >
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={onClose}>
              Close
            </Button>
          </Box>
        ) : job ? (
          <>
            {/* Job ID & Status */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace", color: "secondary.main" }}
                >
                  {job.job_id}
                </Typography>
                {statusStyle && (
                  <Chip
                    label={statusStyle.label}
                    size="small"
                    sx={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      fontWeight: 500,
                      fontSize: "0.7rem",
                    }}
                  />
                )}
              </Box>
              {job.created_at && (
                <Typography variant="caption" color="text.secondary">
                  Created: {formatDateTime(job.created_at)}
                </Typography>
              )}
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "rgba(255, 255, 255, 0.08)", px: 2.5 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": {
                    minHeight: 40,
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                    "&.Mui-selected": {
                      color: "secondary.main",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "secondary.main",
                  },
                }}
              >
                <Tab label="Video" />
                <Tab label="Metrics" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
              {/* Video Tab */}
              <TabPanel value={activeTab} index={0}>
                {/* Job Details */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Details
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Input File
                      </Typography>
                      <Typography variant="body2">
                        {job.input_filename || "-"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        File Size
                      </Typography>
                      <Typography variant="body2">
                        {formatBytes(job.input_size_bytes)}
                      </Typography>
                    </Box>
                    {job.race && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Race
                        </Typography>
                        <Typography variant="body2">{job.race}</Typography>
                      </Box>
                    )}
                    {job.series && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Series
                        </Typography>
                        <Typography variant="body2">{job.series}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Stage
                      </Typography>
                      <Typography variant="body2">{job.stage || "-"}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Output Video */}
                {job.status === "COMPLETE" && job.output?.available && (
                  <>
                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 3 }} />
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                        Output Video
                      </Typography>
                      
                      <Box
                        sx={{
                          position: "relative",
                          borderRadius: 2,
                          overflow: "hidden",
                          background: "rgba(0, 0, 0, 0.4)",
                          aspectRatio: "16/9",
                          border: "1px solid rgba(47, 174, 142, 0.3)",
                          mb: 2,
                        }}
                      >
                        {isLoadingVideo ? (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 2,
                            }}
                          >
                            <CircularProgress size={32} color="secondary" />
                            <Typography color="text.secondary" variant="body2">
                              Loading video...
                            </Typography>
                          </Box>
                        ) : outputBlobUrl ? (
                          <video
                            key={`drawer-output-${runId}`}
                            controls
                            preload="metadata"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          >
                            <source src={outputBlobUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Typography color="text.secondary">
                              Video unavailable
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", gap: 1.5 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          onClick={handleDownload}
                          disabled={isLoadingVideo}
                          sx={{
                            background: "linear-gradient(135deg, #004225 0%, #002D1A 100%)",
                            border: "1px solid rgba(47, 174, 142, 0.3)",
                          }}
                        >
                          Download
                        </Button>
                        {outputUrl && (
                          <Button
                            variant="outlined"
                            startIcon={<OpenInNewIcon />}
                            href={outputUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ minWidth: 120 }}
                          >
                            Open
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </>
                )}

                {/* Logs (if available) */}
                {job.logs && job.logs.length > 0 && (
                  <>
                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 3 }} />
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                        Logs
                      </Typography>
                      <Box
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          borderRadius: 1,
                          p: 1.5,
                          maxHeight: 200,
                          overflowY: "auto",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                        }}
                      >
                        {job.logs.map((log, i) => (
                          <Typography
                            key={i}
                            variant="body2"
                            sx={{
                              fontFamily: "inherit",
                              fontSize: "inherit",
                              color: log.includes("ERROR")
                                ? "error.main"
                                : log.includes("WARN")
                                ? "warning.main"
                                : "text.secondary",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                            }}
                          >
                            {log}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </TabPanel>

              {/* Metrics Tab */}
              <TabPanel value={activeTab} index={1}>
                {metricsLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 6,
                      gap: 2,
                    }}
                  >
                    <CircularProgress size={32} color="secondary" />
                    <Typography color="text.secondary" variant="body2">
                      Loading metrics...
                    </Typography>
                  </Box>
                ) : metricsError ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography color="error" variant="body2">
                      {metricsError}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      Timing metrics (seconds).
                    </Typography>

                    {!hasAnyMetric && (
                      <Box
                        sx={{
                          mb: 2,
                          py: 1.5,
                          px: 2,
                          borderRadius: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px dashed rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "rgba(155, 183, 168, 0.6)",
                            fontStyle: "italic",
                            fontSize: "0.8rem",
                          }}
                        >
                          No metrics recorded yet for this run.
                        </Typography>
                      </Box>
                    )}

                    {/* Row 1: Fuel, Driver In, Driver Out */}
                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                      <Grid item xs={4}>
                        <MetricCard
                          label="Fuel"
                          value={metrics?.fuel_time_s}
                          icon={<LocalGasStationOutlinedIcon />}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <MetricCard
                          label="Driver In"
                          value={metrics?.driver_in_time_s}
                          icon={<LoginOutlinedIcon />}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <MetricCard
                          label="Driver Out"
                          value={metrics?.driver_out_time_s}
                          icon={<LogoutOutlinedIcon />}
                        />
                      </Grid>
                    </Grid>

                    {/* Row 2: Tyres (FL, FR, BL, BR) */}
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <MetricCard
                          label="Front Left"
                          value={metrics?.front_left_tyre_time_s}
                          icon={<DonutSmallOutlinedIcon />}
                          positionPill="FL"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <MetricCard
                          label="Front Right"
                          value={metrics?.front_right_tyre_time_s}
                          icon={<DonutLargeOutlinedIcon />}
                          positionPill="FR"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <MetricCard
                          label="Back Left"
                          value={metrics?.back_left_tyre_time_s}
                          icon={<AdjustOutlinedIcon />}
                          positionPill="BL"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <MetricCard
                          label="Back Right"
                          value={metrics?.back_right_tyre_time_s}
                          icon={<RadioButtonCheckedOutlinedIcon />}
                          positionPill="BR"
                        />
                      </Grid>
                    </Grid>
                  </>
                )}
              </TabPanel>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary">No run selected</Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default RunDetailsDrawer;
