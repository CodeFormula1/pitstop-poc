import { Box, Typography, Grid, Chip } from "@mui/material";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import DonutSmallOutlinedIcon from "@mui/icons-material/DonutSmallOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import AdjustOutlinedIcon from "@mui/icons-material/AdjustOutlined";
import RadioButtonCheckedOutlinedIcon from "@mui/icons-material/RadioButtonCheckedOutlined";
import GlassCard from "../GlassCard";

/** Pitstop timing metrics (all in seconds) - matches backend PitstopRunMetrics */
export interface PitstopMetrics {
  fuel_time_s?: number | null;
  front_left_tyre_time_s?: number | null;
  front_right_tyre_time_s?: number | null;
  back_left_tyre_time_s?: number | null;
  back_right_tyre_time_s?: number | null;
  driver_out_time_s?: number | null;
  driver_in_time_s?: number | null;
}

interface MetricsPanelProps {
  metrics: PitstopMetrics;
  status?: string;
}

interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
  icon?: React.ReactNode;
  positionPill?: string; // e.g. "FL", "FR", "BL", "BR" for tyres
}

/** Individual metric card component */
const MetricCard = ({ label, value, unit = "s", icon, positionPill }: MetricCardProps) => {
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? value.toFixed(2) : "—";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.07)",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s ease",
        minHeight: 110,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flex: 1,
        "&:hover": {
          borderColor: "rgba(47, 174, 142, 0.3)",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        },
      }}
    >
      {/* Icon + Label + Position Pill row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
        {icon && (
          <Box
            sx={{
              color: hasValue ? "rgba(47, 174, 142, 0.6)" : "rgba(155, 183, 168, 0.3)",
              display: "flex",
              alignItems: "center",
              "& svg": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
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
              height: 18,
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: "rgba(47, 174, 142, 0.15)",
              color: "secondary.main",
              border: "1px solid rgba(47, 174, 142, 0.3)",
              "& .MuiChip-label": {
                px: 0.75,
              },
            }}
          />
        )}
      </Box>

      {/* Value */}
      <Box sx={{ display: "flex", alignItems: "baseline" }}>
        <Typography
          variant="h4"
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
            }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/** Row 1 metrics: Fuel, Driver In, Driver Out */
const ROW1_CONFIG: { key: keyof PitstopMetrics; label: string; icon: React.ReactNode }[] = [
  { key: "fuel_time_s", label: "Fuel Time", icon: <LocalGasStationOutlinedIcon /> },
  { key: "driver_in_time_s", label: "Driver In", icon: <LoginOutlinedIcon /> },
  { key: "driver_out_time_s", label: "Driver Out", icon: <LogoutOutlinedIcon /> },
];

/** Row 2 metrics: Tyres (FL, FR, BL, BR) */
const ROW2_CONFIG: { key: keyof PitstopMetrics; label: string; icon: React.ReactNode; pill: string }[] = [
  { key: "front_left_tyre_time_s", label: "Front Left", icon: <DonutSmallOutlinedIcon />, pill: "FL" },
  { key: "front_right_tyre_time_s", label: "Front Right", icon: <DonutLargeOutlinedIcon />, pill: "FR" },
  { key: "back_left_tyre_time_s", label: "Back Left", icon: <AdjustOutlinedIcon />, pill: "BL" },
  { key: "back_right_tyre_time_s", label: "Back Right", icon: <RadioButtonCheckedOutlinedIcon />, pill: "BR" },
];

/** Combined config for checking if any metric exists */
const ALL_KEYS: (keyof PitstopMetrics)[] = [
  ...ROW1_CONFIG.map(c => c.key),
  ...ROW2_CONFIG.map(c => c.key),
];

const MetricsPanel = ({ metrics }: MetricsPanelProps) => {
  const hasAnyMetric = ALL_KEYS.some(
    (key) => metrics[key] !== null && metrics[key] !== undefined
  );

  return (
    <GlassCard>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Timing metrics (seconds). Will populate after model run.
        </Typography>
      </Box>

      {/* Metrics Cards */}
      {!hasAnyMetric ? (
        // Empty state
        <Box
          sx={{
            py: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "rgba(155, 183, 168, 0.6)",
              fontStyle: "italic",
            }}
          >
            No metrics available
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Row 1: Fuel, Driver In, Driver Out (3 cards) */}
          <Grid container spacing={2}>
            {ROW1_CONFIG.map(({ key, label, icon }) => (
              <Grid item xs={12} sm={6} md={4} key={key} sx={{ display: "flex" }}>
                <MetricCard
                  label={label}
                  value={metrics[key]}
                  icon={icon}
                />
              </Grid>
            ))}
          </Grid>

          {/* Row 2: Tyres (4 cards) */}
          <Grid container spacing={2}>
            {ROW2_CONFIG.map(({ key, label, icon, pill }) => (
              <Grid item xs={12} sm={6} md={3} key={key} sx={{ display: "flex" }}>
                <MetricCard
                  label={label}
                  value={metrics[key]}
                  icon={icon}
                  positionPill={pill}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </GlassCard>
  );
};

export default MetricsPanel;
