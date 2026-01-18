import { useCallback } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import GlassCard from "../GlassCard";
import { formatFileSize } from "../../mock/pitstopMock";

interface UploadPanelProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [".mp4", ".mov", ".mkv"];
const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

const UploadPanel = ({ file, onFileSelect, disabled }: UploadPanelProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect, disabled]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
    e.target.value = "";
  };

  const isOversized = file && file.size > MAX_SIZE_BYTES;

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
      {/* Header */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, flexShrink: 0 }}>
        Upload Video
      </Typography>

      {/* Dropzone - fixed size */}
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: "2px dashed",
          borderColor: disabled ? "grey.700" : "primary.main",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.2s ease",
          background: "rgba(255, 106, 0, 0.03)",
          flexShrink: 0,
          "&:hover": disabled
            ? {}
            : {
                background: "rgba(255, 106, 0, 0.08)",
                borderColor: "primary.light",
              },
        }}
      >
        <CloudUploadIcon
          sx={{ fontSize: 48, color: "primary.main", mb: 2 }}
        />
        <Typography variant="body1" sx={{ mb: 1 }}>
          Drag & drop your video file here
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Supported formats: {ACCEPTED_TYPES.join(", ")}
        </Typography>
        <Button
          variant="outlined"
          component="label"
          disabled={disabled}
          startIcon={<InsertDriveFileIcon />}
        >
          Choose File
          <input
            type="file"
            hidden
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileInput}
          />
        </Button>
      </Box>

      {/* Selected File section - always reserve space */}
      <Box sx={{ mt: 3, flex: 1, minHeight: 100, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, flexShrink: 0 }}>
          Selected File
        </Typography>
        
        {file ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                borderRadius: 2,
                background: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <InsertDriveFileIcon sx={{ color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)} • Duration: —
                </Typography>
              </Box>
            </Box>

            {isOversized && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                File exceeds 1GB. Upload may take longer and could fail on slow connections.
              </Alert>
            )}
          </Box>
        ) : (
          // Placeholder when no file selected - same reserved space
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              borderRadius: 2,
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              background: "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "rgba(155, 183, 168, 0.5)",
                fontStyle: "italic",
              }}
            >
              No file selected
            </Typography>
          </Box>
        )}
      </Box>
    </GlassCard>
  );
};

export default UploadPanel;
