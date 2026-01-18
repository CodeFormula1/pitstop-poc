import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#004225" },
    secondary: { main: "#2FAE8E" },
    success: { main: "#3DDC97" },
    background: {
      default: "#0B0F0C",
      paper: "#121A15",
    },
    text: {
      primary: "#EAF4EF",
      secondary: "#9BB7A8",
    },
    divider: "rgba(255,255,255,0.07)",
  },
  shape: { borderRadius: 14 },
  spacing: 8,
  typography: {
    fontFamily: "\"Inter\", \"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
    h1: { fontSize: 40, fontWeight: 700, letterSpacing: 0.4 },
    h2: { fontSize: 30, fontWeight: 700, letterSpacing: 0.3 },
    h3: { fontSize: 24, fontWeight: 600 },
    h4: { fontSize: 20, fontWeight: 600 },
    body1: { fontSize: 16 },
    body2: { fontSize: 14 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(11, 15, 12, 0.88)",
          backdropFilter: "blur(12px)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "rgba(11, 15, 12, 0.92)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255, 255, 255, 0.07)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        contained: {
          "&:focus-visible": {
            outline: "2px solid rgba(47, 174, 142, 0.5)",
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2FAE8E",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "rgba(0, 66, 37, 0.25)",
          color: "#2FAE8E",
        },
      },
    },
  },
});

export default theme;
