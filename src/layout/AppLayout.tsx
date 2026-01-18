import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import SideNav from "../components/SideNav";
import TopBar from "../components/TopBar";

const AppLayout = () => {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <SideNav />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <Box sx={{ flex: 1, overflow: "auto", p: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;

