import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Build";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import { NavLink } from "react-router-dom";

const HEADER_HEIGHT = 64;

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/dashboard" },
  { label: "Pitstop", icon: <BuildIcon />, to: "/pitstop" },
  { label: "Tyre Strategy", icon: <TireRepairIcon />, to: "/tyre-strategy" },
];

const SideNav = () => {
  return (
    <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0 }}>
      <Box sx={{ width: 240, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box
          component={NavLink}
          to="/"
          sx={{
            px: 3,
            height: HEADER_HEIGHT,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            textDecoration: "none",
            cursor: "pointer",
            transition: "opacity 0.2s ease",
            "&:hover": {
              opacity: 0.8,
            },
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: "secondary.main",
              fontFamily: "Audiowide, sans-serif",
              fontWeight: 400,
              letterSpacing: "0.02em",
              fontSize: "1.75rem",
              lineHeight: 1.2,
            }}
          >
            CodeFx
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25, letterSpacing: "0.03em", fontSize: "0.75rem" }}
          >
            Live ops intelligence
          </Typography>
        </Box>
        <List sx={{ px: 2, py: 2 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 2,
                mb: 1,
                "&.active": {
                  background: "rgba(0, 66, 37, 0.35)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "secondary.main" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ mt: "auto", px: 3, pb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Power unit telemetry sync
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SideNav;
