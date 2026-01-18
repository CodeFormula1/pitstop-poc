import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import ComparePage from "./pages/ComparePage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import ModelRunsPage from "./pages/ModelRunsPage";
import PitstopPage from "./pages/PitstopPage";
import TyreStrategyPage from "./pages/TyreStrategyPage";

const App = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pitstop" element={<PitstopPage />} />
          <Route path="/tyre-strategy" element={<TyreStrategyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/model-runs" element={<ModelRunsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default App;
