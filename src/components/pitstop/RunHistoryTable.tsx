import { useState, useEffect } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GlassCard from "../GlassCard";
import type { PitstopJobListItem, PitstopJobStatus } from "../../types/pitstop";

const STORAGE_KEY = "pitstop.runHistoryOpen";

interface RunHistoryTableProps {
  jobs: PitstopJobListItem[];
  onLoadJob: (job: PitstopJobListItem) => void;
  loadingJobId?: string | null;
  isLoading?: boolean;
  // Pagination props
  page: number; // 1-based for UI
  rowsPerPage: number;
  totalJobs: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
}

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

/** Format ISO date string to readable format */
const formatDateTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return isoString;
  }
};

/** Format job ID to short display format */
const formatJobId = (jobId: string): string => {
  // Show first 8 characters of UUID
  return jobId.substring(0, 8);
};

const RunHistoryTable = ({ 
  jobs, 
  onLoadJob, 
  loadingJobId,
  isLoading = false,
  page,
  rowsPerPage,
  totalJobs,
  onPageChange,
  onRowsPerPageChange,
}: RunHistoryTableProps) => {
  // Collapse state with localStorage persistence
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  // Persist collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isOpen));
    } catch {
      // localStorage not available
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Handle MUI TablePagination (0-based page)
  const handlePageChange = (_: unknown, newPage: number) => {
    onPageChange(newPage + 1); // Convert to 1-based
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  return (
    <GlassCard>
      {/* Collapsible Header */}
      <Box
        onClick={handleToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          mb: isOpen ? 2 : 0,
          transition: "margin-bottom 0.2s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Run History
          </Typography>
          {isLoading && <CircularProgress size={18} color="secondary" />}
          {!isLoading && totalJobs > 0 && (
            <Typography variant="body2" color="text.secondary">
              ({totalJobs} total)
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          sx={{
            color: "text.secondary",
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isOpen} timeout={300}>
        {/* Wrapper to prevent click propagation to header toggle */}
        <Box onClick={(e) => e.stopPropagation()}>
      {jobs.length === 0 && !isLoading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No pitstop runs yet. Upload a video to get started.
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }}>
                    Run ID
                  </TableCell>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }}>
                    Date/Time
                  </TableCell>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }}>
                    Race
                  </TableCell>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }}>
                    Input
                  </TableCell>
                  <TableCell sx={{ background: "rgba(18, 26, 21, 0.95)" }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => {
                  const statusStyle = getStatusColor(job.status);
                  const isComplete = job.status === "COMPLETE";
                  const isCurrentlyLoading = loadingJobId === job.job_id;
                  const canPlay = isComplete && job.has_output;
                  
                  return (
                    <TableRow
                      key={job.job_id}
                      hover
                      sx={{
                        opacity: isCurrentlyLoading ? 0.7 : 1,
                        "&:hover": { background: "rgba(0, 66, 37, 0.05)" },
                      }}
                    >
                      <TableCell>
                        <Tooltip title={job.job_id} placement="top">
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace", color: "secondary.main" }}
                          >
                            {formatJobId(job.job_id)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(job.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {job.race || job.series || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Tooltip title={job.input_filename} placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 150,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.input_filename}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip 
                          title={
                            !isComplete 
                              ? "Output not ready" 
                              : !job.has_output 
                              ? "No output available"
                              : "Load results"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("PLAY CLICK", job.job_id, { canPlay, isCurrentlyLoading });
                                if (canPlay && !isCurrentlyLoading) {
                                  onLoadJob(job);
                                }
                              }}
                              disabled={!canPlay || isCurrentlyLoading}
                              sx={{ 
                                color: canPlay ? "secondary.main" : "text.disabled",
                              }}
                            >
                              {isCurrentlyLoading ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <PlayArrowIcon />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination controls */}
          <TablePagination
            component="div"
            count={totalJobs}
            page={page - 1} // MUI uses 0-based
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[3, 5, 10]}
            labelRowsPerPage="Rows:"
            sx={{
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              "& .MuiTablePagination-toolbar": {
                minHeight: 48,
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                color: "text.secondary",
                fontSize: "0.8rem",
              },
              "& .MuiTablePagination-select": {
                color: "text.primary",
              },
              "& .MuiTablePagination-actions button": {
                color: "secondary.main",
                "&.Mui-disabled": {
                  color: "text.disabled",
                },
              },
            }}
          />
        </>
      )}
        </Box>
      </Collapse>
    </GlassCard>
  );
};

export default RunHistoryTable;
