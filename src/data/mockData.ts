export const raceSeries = [
  { id: "f1-2026", name: "F1 NextGen 2026" },
  { id: "wec-2026", name: "WEC HyperPulse" },
];

export const races = [
  { id: "monaco", name: "Monaco GP" },
  { id: "silverstone", name: "Silverstone GP" },
  { id: "spa", name: "Spa-Francorchamps" },
];

export const drivers = [
  { id: "horizon-27", name: "Horizon-27", team: "Quantum Torque" },
  { id: "nova-12", name: "Nova-12", team: "Apex Drift" },
  { id: "zen-44", name: "Zen-44", team: "Pulse Dynamics" },
  { id: "orbit-88", name: "Orbit-88", team: "HyperLine" },
];

export const raceOverview = {
  currentLap: 42,
  totalLaps: 63,
  safetyCarRisk: 0.18,
  tireDegradationIndex: 0.62,
  podiumProbability: 0.74,
};

export const kpiCards = [
  { label: "Win Probability", value: "62%", delta: "+6%" },
  { label: "Average Lap", value: "1:28.402", delta: "-0.3s" },
  { label: "Pit Window", value: "Lap 46-49", delta: "Open" },
  { label: "Fuel Delta", value: "+1.8 kg", delta: "Stable" },
];

export const lapTimeSeries = [
  89.6, 88.9, 88.4, 88.1, 88.0, 87.8, 87.9, 88.2, 88.4, 88.0,
];

export const paceByDriver = drivers.map((driver, index) => ({
  driver: driver.name,
  pace: 86 + index * 1.8,
}));

export const stintPerformance = [
  { lap: 30, soft: 88.2, medium: 88.9, hard: 89.6 },
  { lap: 35, soft: 88.8, medium: 89.2, hard: 90.1 },
  { lap: 40, soft: 89.3, medium: 89.7, hard: 90.4 },
  { lap: 45, soft: 89.9, medium: 90.1, hard: 90.8 },
];

export const positionChanges = [
  { lap: 10, lead: 1, chaser: 3 },
  { lap: 20, lead: 1, chaser: 2 },
  { lap: 30, lead: 2, chaser: 1 },
  { lap: 40, lead: 1, chaser: 2 },
  { lap: 50, lead: 1, chaser: 3 },
];

export const compareScenarios = [
  { id: "base", name: "Baseline Strategy" },
  { id: "aggressive", name: "Aggressive Undercut" },
  { id: "defensive", name: "Defensive Long Run" },
];

export const assumptions = [
  "Safety car probability: 18%",
  "Track temp: 34C",
  "Fuel save target: 0.6 kg/lap",
  "Overtake difficulty: medium",
];

export const scenarioDiffSeries = [
  { lap: 30, delta: -0.4 },
  { lap: 35, delta: -0.7 },
  { lap: 40, delta: -1.2 },
  { lap: 45, delta: -0.6 },
  { lap: 50, delta: 0.2 },
];

export const modelRuns = [
  {
    id: "run-291",
    name: "Monaco Sprint Alpha",
    timestamp: "2026-01-17 09:24",
    status: "Complete",
    winnerProb: 0.61,
  },
  {
    id: "run-292",
    name: "Monaco Sprint Beta",
    timestamp: "2026-01-17 10:05",
    status: "Complete",
    winnerProb: 0.58,
  },
  {
    id: "run-293",
    name: "Rain Forecast Sync",
    timestamp: "2026-01-17 10:42",
    status: "Queued",
    winnerProb: 0.54,
  },
  {
    id: "run-294",
    name: "Late Safety Car",
    timestamp: "2026-01-17 11:18",
    status: "Complete",
    winnerProb: 0.65,
  },
];

export const runDetail = {
  summary: {
    trackEvolution: "High grip, low wind",
    projectedFinish: "P1",
    pointsGain: "+6",
  },
  probabilities: [
    { label: "Win", value: 0.63 },
    { label: "Podium", value: 0.82 },
    { label: "Top 5", value: 0.93 },
  ],
};

