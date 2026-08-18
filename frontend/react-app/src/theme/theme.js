import { createTheme } from "@mui/material/styles";

import { palette } from "./palette";
import { typography } from "./typography";
import { spacing } from "./spacing";
import { shape } from "./shape";
import { shadows } from "./shadows";
import { breakpoints } from "./breakpoints";

export const appTheme = createTheme({
  palette,

  typography,

  spacing,

  shape,

  shadows,

  breakpoints,

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E1E8F0",
          boxShadow: "0 2px 5px rgba(15, 35, 63, 0.04)",
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: "#52647a",
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          backgroundColor: "#F8FAFC",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 700, textTransform: "none" },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
  },
});
