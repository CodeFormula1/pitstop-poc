import { useEffect, useRef } from "react";
import { Box, LinearProgress, Step, StepLabel, Stepper, Typography } from "@mui/material";
import GlassCard from "../GlassCard";
import type { UIJobStatus } from "../../types/pitstop";

interface JobProgressProps {
  status: UIJobStatus;
  progress: number;
  logs: string[];
  /** Backend stage for more detailed display */
  stage?: string;
}

const STEPS = ["Upload", "Queued", "Processing", "Rendering", "Complete"];

const getActiveStep = (status: UIJobStatus, stage?: string): number => {
  switch (status) {
    case "idle":
      return -1;
    case "uploading":
      return 0;
    case "queued":
      // Check if stage indicates we're still in upload phase
      if (stage === "UPLOAD") return 0;
      return 1;
    case "processing":
      return 2;
    case "rendering":
      return 3;
    case "complete":
      return 5;
    case "failed":
      return -1;
    default:
      return -1;
  }
};

const getProgressLabel = (status: UIJobStatus, stage?: string): string => {
  switch (status) {
    case "uploading":
      return "Uploading video...";
    case "queued":
      if (stage === "UPLOAD") return "Finalizing upload...";
      return "Waiting in queue...";
    case "processing":
      if (stage === "DETECTING") return "Running YOLO detection...";
      if (stage === "TRACKING") return "Tracking objects...";
      return "Processing frames...";
    case "rendering":
      return "Rendering output video...";
    default:
      return "";
  }
};

const JobProgress = ({ status, progress, logs, stage }: JobProgressProps) => {
  const activeStep = getActiveStep(status, stage);
  const isRunning = ["uploading", "queued", "processing", "rendering"].includes(status);
  const isFailed = status === "failed";
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom ONLY within the logs container (not the page)
  useEffect(() => {
    if (!logsContainerRef.current) return;
    logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  return (
    <GlassCard
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: { md: 520 },
      }}
    >
      {/* Header - fixed */}
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, flexShrink: 0 }}>
        Job Progress
      </Typography>

      {/* Stepper - fixed */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, flexShrink: 0 }}>
        {STEPS.map((label, index) => (
          <Step
            key={label}
            completed={activeStep > index}
            sx={{
              "& .MuiStepLabel-root .Mui-completed": {
                color: "secondary.main",
              },
              "& .MuiStepLabel-root .Mui-active": {
                color: "secondary.main",
              },
            }}
          >
            <StepLabel
              error={isFailed && index === activeStep}
              sx={{
                "& .MuiStepLabel-label": {
                  color: "text.secondary",
                  "&.Mui-active": { color: "secondary.main" },
                  "&.Mui-completed": { color: "secondary.main" },
                },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Progress bar - conditional, fixed height */}
      <Box sx={{ minHeight: 56, flexShrink: 0 }}>
        {isRunning && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {getProgressLabel(status, stage)}
              </Typography>
              <Typography variant="body2" color="secondary.main">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  background: "linear-gradient(90deg, #004225 0%, #2FAE8E 100%)",
                },
              }}
            />
          </Box>
        )}

        {isFailed && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
              Job failed. Check logs below for details.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Logs section - flex to fill remaining space */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, flexShrink: 0 }}>
          Live Logs
        </Typography>
        <Box
          ref={logsContainerRef}
          sx={{
            flex: 1,
            minHeight: 150,
            overflow: "auto",
            p: 2,
            borderRadius: 2,
            background: "rgba(0, 0, 0, 0.4)",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: 3,
            },
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Waiting for job to start...
            </Typography>
          ) : (
            logs.map((line, i) => (
              <Box
                key={i}
                sx={{
                  color: line.includes("[ERROR]") || line.includes("ERROR")
                    ? "error.main"
                    : line.includes("[DONE]") || line.includes("Completed")
                    ? "success.main"
                    : line.includes("[PROC]") || line.includes("Processed") || line.includes("YOLO")
                    ? "secondary.main"
                    : line.includes("[RENDER]") || line.includes("Rendering")
                    ? "secondary.main"
                    : "text.secondary",
                  mb: 0.5,
                }}
              >
                {line}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </GlassCard>
  );
};

export default JobProgress;
