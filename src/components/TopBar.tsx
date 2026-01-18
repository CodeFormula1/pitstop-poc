import { AppBar, Toolbar, Typography } from "@mui/material";

const HEADER_HEIGHT = 64;

const TopBar = () => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          minHeight: HEADER_HEIGHT,
          height: HEADER_HEIGHT,
        }}
      >
        <Typography variant="h5">Race Ops Console</Typography>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
