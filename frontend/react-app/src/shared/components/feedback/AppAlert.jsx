import React from "react";
import Alert from "@mui/material/Alert";

/**
 * @param {{
 *   severity?: "error" | "warning" | "info" | "success",
 *   children: React.ReactNode
 * }} props
 */
export default function AppAlert({ severity = "info", children }) {
  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {children}
    </Alert>
  );
}
