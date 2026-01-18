import { Box } from "@mui/material";

interface LandingVisualStripProps {
  side: "left" | "right";
}

// Keyframe animations as CSS string
const keyframes = `
  @keyframes floatLeft {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes floatRight {
    0%, 100% { transform: translateY(-10px); }
    50% { transform: translateY(15px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes scanlines {
    0% { background-position: 0 0; }
    100% { background-position: 0 100px; }
  }
`;

// Card gradient presets (racing green tones)
const cardPresets = [
  {
    gradient:
      "linear-gradient(135deg, rgba(0,66,37,0.2) 0%, rgba(47,174,142,0.12) 50%, rgba(0,66,37,0.08) 100%)",
    accentColor: "rgba(47,174,142,0.4)",
  },
  {
    gradient:
      "linear-gradient(145deg, rgba(47,174,142,0.15) 0%, rgba(61,220,151,0.1) 60%, rgba(0,66,37,0.08) 100%)",
    accentColor: "rgba(61,220,151,0.4)",
  },
  {
    gradient:
      "linear-gradient(160deg, rgba(61,220,151,0.12) 0%, rgba(47,174,142,0.15) 40%, rgba(0,66,37,0.1) 100%)",
    accentColor: "rgba(61,220,151,0.35)",
  },
  {
    gradient:
      "linear-gradient(125deg, rgba(0,66,37,0.18) 0%, rgba(47,174,142,0.12) 50%, rgba(61,220,151,0.08) 100%)",
    accentColor: "rgba(47,174,142,0.45)",
  },
  {
    gradient:
      "linear-gradient(140deg, rgba(47,174,142,0.18) 0%, rgba(0,66,37,0.12) 60%, rgba(61,220,151,0.1) 100%)",
    accentColor: "rgba(47,174,142,0.5)",
  },
];

const PosterCard = ({
  index,
  side,
}: {
  index: number;
  side: "left" | "right";
}) => {
  const preset = cardPresets[index % cardPresets.length];
  const animationDuration = side === "left" ? "8s" : "10s";
  const animationName = side === "left" ? "floatLeft" : "floatRight";
  const delay = `${index * 0.5}s`;

  return (
    <Box
      sx={{
        width: 140,
        height: 200,
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        animation: `${animationName} ${animationDuration} ease-in-out infinite`,
        animationDelay: delay,
        // Glassmorphism base
        background: preset.gradient,
        backdropFilter: "blur(12px)",
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.3),
          inset 0 0 20px rgba(255,255,255,0.02)
        `,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.02) 2px,
            rgba(255,255,255,0.02) 4px
          )`,
          animation: "scanlines 3s linear infinite",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.05) 50%,
            transparent 100%
          )`,
          backgroundSize: "200% 100%",
          animation: "shimmer 4s ease-in-out infinite",
          animationDelay: delay,
          pointerEvents: "none",
        },
      }}
    >
      {/* Inner subtle accent */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "10%",
          width: "80%",
          height: "30%",
          background: `radial-gradient(ellipse at center, ${preset.accentColor} 0%, transparent 70%)`,
          filter: "blur(20px)",
          opacity: 0.5,
        }}
      />
      {/* Speed lines */}
      <Box
        sx={{
          position: "absolute",
          bottom: "20%",
          left: 0,
          width: "100%",
          height: "40%",
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.03) 8px,
            rgba(255,255,255,0.03) 10px
          )`,
          transform: "skewY(-5deg)",
        }}
      />
    </Box>
  );
};

const LandingVisualStrip = ({ side }: LandingVisualStripProps) => {
  const cardCount = 5;
  const isLeft = side === "left";

  return (
    <>
      {/* Inject keyframes */}
      <style>{keyframes}</style>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [side]: 0,
          width: 180,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          py: 4,
          zIndex: 2,
          pointerEvents: "none",
          // Fade edges
          maskImage: `linear-gradient(
            to bottom,
            transparent 0%,
            black 15%,
            black 85%,
            transparent 100%
          )`,
          WebkitMaskImage: `linear-gradient(
            to bottom,
            transparent 0%,
            black 15%,
            black 85%,
            transparent 100%
          )`,
          // Slight perspective
          transform: isLeft ? "perspective(800px) rotateY(5deg)" : "perspective(800px) rotateY(-5deg)",
          transformOrigin: isLeft ? "right center" : "left center",
        }}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <PosterCard key={i} index={i} side={side} />
        ))}
      </Box>
    </>
  );
};

export default LandingVisualStrip;

