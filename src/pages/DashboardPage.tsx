import { Box, Grid, Typography } from "@mui/material";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import GlassCard from "../components/GlassCard";
import PageTransition from "../components/PageTransition";
import {
  kpiCards,
  lapTimeSeries,
  paceByDriver,
  positionChanges,
  raceOverview,
  stintPerformance,
} from "../data/mockData";

const motionItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const DashboardPage = () => {
  const lapTimeOptions = {
    grid: { left: 30, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: lapTimeSeries.map((_, index) => `L${index + 1}`),
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
      axisLabel: { color: "#9BB7A8" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
      axisLabel: { color: "#9BB7A8" },
    },
    series: [
      {
        data: lapTimeSeries,
        type: "line",
        smooth: true,
        lineStyle: { color: "#004225", width: 3 },
        areaStyle: { color: "rgba(0, 66, 37, 0.2)" },
      },
    ],
  };

  const paceOptions = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "value",
      axisLabel: { color: "#9BB7A8" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
    },
    yAxis: {
      type: "category",
      data: paceByDriver.map((item) => item.driver),
      axisLabel: { color: "#9BB7A8" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
    },
    series: [
      {
        type: "bar",
        data: paceByDriver.map((item) => item.pace),
        itemStyle: { color: "#2FAE8E" },
        barWidth: 14,
      },
    ],
  };

  const stintOptions = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    legend: { textStyle: { color: "#9BB7A8" } },
    xAxis: {
      type: "category",
      data: stintPerformance.map((item) => `L${item.lap}`),
      axisLabel: { color: "#9BB7A8" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#9BB7A8" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
    },
    series: [
      {
        name: "Soft",
        type: "line",
        data: stintPerformance.map((item) => item.soft),
        smooth: true,
        lineStyle: { color: "#004225" },
      },
      {
        name: "Medium",
        type: "line",
        data: stintPerformance.map((item) => item.medium),
        smooth: true,
        lineStyle: { color: "#2FAE8E" },
      },
      {
        name: "Hard",
        type: "line",
        data: stintPerformance.map((item) => item.hard),
        smooth: true,
        lineStyle: { color: "#3DDC97" },
      },
    ],
  };

  const positionOptions = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: positionChanges.map((item) => `L${item.lap}`),
      axisLabel: { color: "#9BB7A8" },
    },
    yAxis: {
      type: "value",
      inverse: true,
      min: 1,
      max: 5,
      axisLabel: { color: "#9BB7A8" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
    },
    series: [
      {
        name: "Lead Car",
        type: "line",
        data: positionChanges.map((item) => item.lead),
        smooth: true,
        lineStyle: { color: "#004225" },
      },
      {
        name: "Closest Rival",
        type: "line",
        data: positionChanges.map((item) => item.chaser),
        smooth: true,
        lineStyle: { color: "#2FAE8E" },
      },
    ],
  };

  return (
    <PageTransition>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ mb: 1 }}>
            Live Race Snapshot
          </Typography>
          <Typography color="text.secondary">
            Lap {raceOverview.currentLap} of {raceOverview.totalLaps} | Safety
            car risk {Math.round(raceOverview.safetyCarRisk * 100)}%
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {kpiCards.map((card, index) => (
            <Grid item xs={12} md={3} key={card.label}>
              <motion.div
                {...motionItem}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="secondary" sx={{ mt: 1 }}>
                    {card.delta}
                  </Typography>
                </GlassCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <motion.div {...motionItem}>
              <GlassCard>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Lap Time Trend
                </Typography>
                <ReactECharts option={lapTimeOptions} style={{ height: 260 }} />
              </GlassCard>
            </motion.div>
          </Grid>
          <Grid item xs={12} lg={6}>
            <motion.div {...motionItem}>
              <GlassCard>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Driver Pace Delta
                </Typography>
                <ReactECharts option={paceOptions} style={{ height: 260 }} />
              </GlassCard>
            </motion.div>
          </Grid>
          <Grid item xs={12} lg={6}>
            <motion.div {...motionItem}>
              <GlassCard>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Tire Stint Performance
                </Typography>
                <ReactECharts option={stintOptions} style={{ height: 260 }} />
              </GlassCard>
            </motion.div>
          </Grid>
          <Grid item xs={12} lg={6}>
            <motion.div {...motionItem}>
              <GlassCard>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Position Volatility
                </Typography>
                <ReactECharts option={positionOptions} style={{ height: 260 }} />
              </GlassCard>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default DashboardPage;
