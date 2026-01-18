import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import CodeFxLogo from "../assets/CodeFxLogo";
import LandingVisualStrip from "../components/LandingVisualStrip";

const LandingPage = () => {
  return (
    <PageTransition>
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0B0F0C 0%, #121A15 50%, #0B0F0C 100%)",
        }}
      >
        {/* Video Background */}
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          src="/media/race-bg.mp4"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.45)",
          }}
        />

        {/* Animated gradient overlay for extra depth */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(0,66,37,0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 50%, rgba(47,174,142,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.8) 0%, transparent 60%)
            `,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Left Visual Strip */}
        <LandingVisualStrip side="left" />

        {/* Right Visual Strip */}
        <LandingVisualStrip side="right" />

        {/* Main Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 3,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 3,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <CodeFxLogo
                sx={{
                  mb: 3,
                  filter: "drop-shadow(0 0 30px rgba(47,174,142,0.2))",
                  maxWidth: { xs: 280, sm: 400, md: 550 },
                }}
              />
            </motion.div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  mb: 4,
                  fontWeight: 300,
                  letterSpacing: "0.05em",
                  maxWidth: 500,
                }}
              >
                Command the model. Predict every move.
              </Typography>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Button
                variant="contained"
                size="large"
                component={Link}
                to="/dashboard"
                sx={{
                  px: 5,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  background: "linear-gradient(135deg, #004225 0%, #002D1A 100%)",
                  border: "1px solid rgba(47, 174, 142, 0.3)",
                  boxShadow: "0 4px 20px rgba(0, 66, 37, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #005530 0%, #004225 100%)",
                    boxShadow: "0 6px 28px rgba(0, 66, 37, 0.4)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Enter Race Control
              </Button>
            </motion.div>
          </motion.div>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default LandingPage;
