import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Typography variant="h3" sx={{ letterSpacing: "-0.025em" }}>
        {title}
      </Typography>

      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
