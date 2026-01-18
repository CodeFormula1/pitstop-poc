import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import PageTransition from "../components/PageTransition";
import GlassCard from "../components/GlassCard";

const TyreStrategyPage = () => {
  return (
    <PageTransition>
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Tyre Strategy
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Optimize compound selection and pit timing.
            </Typography>
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <GlassCard
            sx={{
              minHeight: 400,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <TireRepairIcon
                sx={{
                  fontSize: 80,
                  color: "secondary.main",
                  mb: 3,
                  opacity: 0.6,
                }}
              />
            </motion.div>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
              Coming Soon
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 400 }}
            >
              The Tyre Strategy module is under development. This feature will
              help predict optimal tyre compound choices and pit window timing
              based on race conditions.
            </Typography>

            <Box
              sx={{
                mt: 4,
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {["Soft", "Medium", "Hard", "Intermediate", "Wet"].map(
                (compound, i) => (
                  <motion.div
                    key={compound}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        background:
                          compound === "Soft"
                            ? "rgba(255, 0, 0, 0.15)"
                            : compound === "Medium"
                            ? "rgba(255, 193, 7, 0.15)"
                            : compound === "Hard"
                            ? "rgba(255, 255, 255, 0.1)"
                            : compound === "Intermediate"
                            ? "rgba(61, 220, 151, 0.15)"
                            : "rgba(33, 150, 243, 0.15)",
                        border: "1px solid",
                        borderColor:
                          compound === "Soft"
                            ? "rgba(255, 0, 0, 0.3)"
                            : compound === "Medium"
                            ? "rgba(255, 193, 7, 0.3)"
                            : compound === "Hard"
                            ? "rgba(255, 255, 255, 0.2)"
                            : compound === "Intermediate"
                            ? "rgba(61, 220, 151, 0.3)"
                            : "rgba(33, 150, 243, 0.3)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color:
                            compound === "Soft"
                              ? "#ff5252"
                              : compound === "Medium"
                              ? "#ffc107"
                              : compound === "Hard"
                              ? "#EAF4EF"
                              : compound === "Intermediate"
                              ? "#3DDC97"
                              : "#42a5f5",
                        }}
                      >
                        {compound}
                      </Typography>
                    </Box>
                  </motion.div>
                )
              )}
            </Box>
          </GlassCard>
        </motion.div>
      </Box>
    </PageTransition>
  );
};

export default TyreStrategyPage;

