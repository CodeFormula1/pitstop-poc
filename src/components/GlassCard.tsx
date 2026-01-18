import { Paper, PaperProps } from "@mui/material";

const GlassCard = ({ sx, ...props }: PaperProps) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.07)",
        background: "rgba(18, 26, 21, 0.72)",
        backdropFilter: "blur(18px)",
        ...sx,
      }}
      {...props}
    />
  );
};

export default GlassCard;
