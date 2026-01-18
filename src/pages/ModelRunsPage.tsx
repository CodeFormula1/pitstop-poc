import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { useState } from "react";
import GlassCard from "../components/GlassCard";
import PageTransition from "../components/PageTransition";
import { modelRuns, runDetail } from "../data/mockData";

const ModelRunsPage = () => {
  const [selectedRunId, setSelectedRunId] = useState(modelRuns[0].id);
  const selectedRun = modelRuns.find((run) => run.id === selectedRunId);

  return (
    <PageTransition>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="h3">Model Runs</Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 3 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Runs
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Run</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Win Prob</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modelRuns.map((run) => (
                    <TableRow
                      key={run.id}
                      hover
                      onClick={() => setSelectedRunId(run.id)}
                      sx={{
                        cursor: "pointer",
                        background:
                          run.id === selectedRunId
                            ? "rgba(0, 229, 255, 0.12)"
                            : "transparent",
                      }}
                    >
                      <TableCell>{run.name}</TableCell>
                      <TableCell>{run.timestamp}</TableCell>
                      <TableCell>{run.status}</TableCell>
                      <TableCell align="right">
                        {Math.round(run.winnerProb * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard sx={{ height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Run Detail
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedRun?.name}
              </Typography>
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="body2">
                  Track: {runDetail.summary.trackEvolution}
                </Typography>
                <Typography variant="body2">
                  Projected Finish: {runDetail.summary.projectedFinish}
                </Typography>
                <Typography variant="body2">
                  Points Gain: {runDetail.summary.pointsGain}
                </Typography>
              </Box>
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1 }}>
                {runDetail.probabilities.map((item) => (
                  <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      {Math.round(item.value * 100)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default ModelRunsPage;

