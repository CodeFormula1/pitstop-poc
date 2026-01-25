import { Box, SxProps, Theme } from "@mui/material";

interface CodeFxLogoProps {
  sx?: SxProps<Theme>;
}

const CodeFxLogo = ({ sx }: CodeFxLogoProps) => {
  return (
    <Box
      component="svg"
      viewBox="0 0 2118 774"
      xmlns="http://www.w3.org/2000/svg"
      sx={{
        width: "100%",
        maxWidth: 600,
        height: "auto",
        ...sx,
      }}
    >
      <g transform="translate(-737 -1283)">
        <g>
          <text
            fill="#FFFFFF"
            fillOpacity="1"
            fontFamily="Audiowide, sans-serif"
            fontStyle="normal"
            fontVariant="normal"
            fontWeight="400"
            fontStretch="normal"
            fontSize="367"
            textAnchor="start"
            direction="ltr"
            writingMode="lr-tb"
            unicodeBidi="normal"
            textDecoration="none"
            transform="matrix(1 0 0 1 958.224 1738)"
          >
            Code
          </text>
          <text
            fill="#FFFFFF"
            fillOpacity="1"
            fontFamily="Audiowide, sans-serif"
            fontStyle="normal"
            fontVariant="normal"
            fontWeight="400"
            fontStretch="normal"
            fontSize="303"
            textAnchor="start"
            direction="ltr"
            writingMode="lr-tb"
            unicodeBidi="normal"
            textDecoration="none"
            transform="matrix(1 0 0 1 1978.59 1738)"
          >
            F(x)
          </text>
        </g>
      </g>
    </Box>
  );
};

export default CodeFxLogo;


