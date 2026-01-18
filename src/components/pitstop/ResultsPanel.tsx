import { Box, Button, Chip, CircularProgress, Grid, Link, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import GlassCard from "../GlassCard";

interface ResultsPanelProps {
  inputUrl: string | null;
  /** URL for video playback (may be blob URL) */
  outputUrl: string | null;
  /** URL for download (direct backend URL) */
  outputDownloadUrl?: string | null;
  /** Job ID for debugging */
  jobId?: string | null;
  onDownload: () => void;
  /** Whether this is real output from the backend (vs mock/simulation) */
  isRealOutput?: boolean;
  /** Whether the output video is currently being loaded */
  isLoadingOutput?: boolean;
}

const ResultsPanel = ({
  inputUrl,
  outputUrl,
  outputDownloadUrl,
  jobId,
  onDownload,
  isRealOutput = false,
  isLoadingOutput = false,
}: ResultsPanelProps) => {
  if (!inputUrl && !outputUrl) {
    return (
      <GlassCard>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Results
        </Typography>
        <Box
          sx={{
            py: 6,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body1">
            Run the pitstop model to see results here.
          </Typography>
        </Box>
      </GlassCard>
    );
  }

  // Use download URL for "Open in tab" link if available
  const debugUrl = outputDownloadUrl || outputUrl;

  return (
    <GlassCard>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Results
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Input Video
            </Typography>
            <Box
              sx={{
                position: "relative",
                borderRadius: 2,
                overflow: "hidden",
                background: "rgba(0, 0, 0, 0.4)",
                aspectRatio: "16/9",
              }}
            >
              {inputUrl ? (
                <video
                  controls
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                >
                  <source src={inputUrl} type="video/mp4" />
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
                  <Typography color="text.secondary">No input video</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle2">Output Video</Typography>
              {(outputUrl || isLoadingOutput) && (
                <Chip
                  label={isRealOutput ? "YOLO Processed" : "Mock Output"}
                  size="small"
                  sx={{
                    backgroundColor: isRealOutput 
                      ? "rgba(47, 174, 142, 0.2)" 
                      : "rgba(255, 152, 0, 0.2)",
                    color: isRealOutput ? "#2FAE8E" : "#FF9800",
                    fontSize: "0.65rem",
                    height: 20,
                  }}
                />
              )}
            </Box>
            <Box
              sx={{
                position: "relative",
                borderRadius: 2,
                overflow: "hidden",
                background: "rgba(0, 0, 0, 0.4)",
                aspectRatio: "16/9",
                border: outputUrl 
                  ? "1px solid rgba(47, 174, 142, 0.3)" 
                  : "1px solid transparent",
              }}
            >
              {isLoadingOutput ? (
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
                    Loading output video...
                  </Typography>
                </Box>
              ) : outputUrl ? (
                <video
                  key={`output-${jobId}-${outputUrl}`}
                  controls
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                >
                  <source src={outputUrl} type="video/mp4" />
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
                  <Typography color="text.secondary">Processing...</Typography>
                </Box>
              )}
            </Box>

            {/* Debug info for output URL */}
            {debugUrl && isRealOutput && (
              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontFamily: "monospace", 
                    fontSize: "0.65rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "70%",
                  }}
                >
                  {outputUrl?.startsWith("blob:") ? "(blob URL)" : debugUrl}
                </Typography>
                {outputDownloadUrl && (
                  <Link
                    href={outputDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 0.5,
                      fontSize: "0.7rem",
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                    Open in tab
                  </Link>
                )}
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<DownloadIcon />}
                onClick={onDownload}
                disabled={!outputUrl || isLoadingOutput}
              >
                Download Output
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </GlassCard>
  );
};

export default ResultsPanel;
