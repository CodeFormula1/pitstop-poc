import { Box, FormControl, Grid, MenuItem, Select, Typography } from "@mui/material";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useState } from "react";
import GlassCard from "../components/GlassCard";
import PageTransition from "../components/PageTransition";
import { assumptions, compareScenarios, scenarioDiffSeries } from "../data/mockData";

const ComparePage = () => {
  const [leftScenario, setLeftScenario] = useState(compareScenarios[0].id);
  const [rightScenario, setRightScenario] = useState(compareScenarios[1].id);

  const diffOptions = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: scenarioDiffSeries.map((item) => `L${item.lap}`),
      axisLabel: { color: "#9BB7A8" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#9BB7A8" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: scenarioDiffSeries.map((item) => item.delta),
        lineStyle: { color: "#2FAE8E", width: 3 },
        areaStyle: { color: "rgba(47, 174, 142, 0.15)" },
      },
    ],
  };

  return (
    <PageTransition>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="h3">Scenario Compare</Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard>
                <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Scenario A
                    </Typography>
                    <Select value={leftScenario} onChange={(event) => setLeftScenario(event.target.value)}>
                      {compareScenarios.map((scenario) => (
                        <MenuItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Scenario B
                    </Typography>
                    <Select value={rightScenario} onChange={(event) => setRightScenario(event.target.value)}>
                      {compareScenarios.map((scenario) => (
                        <MenuItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Delta to Baseline (sec)
                </Typography>
                <ReactECharts option={diffOptions} style={{ height: 300 }} />
              </GlassCard>
            </motion.div>
          </Grid>
          <Grid item xs={12} lg={4}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard sx={{ height: "100%" }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Assumptions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {assumptions.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  ))}
                </Box>
              </GlassCard>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default ComparePage;

