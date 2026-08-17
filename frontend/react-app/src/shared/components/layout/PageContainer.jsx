import React from "react";
import Box from "@mui/material/Box";

export default function PageContainer({
                                          children
                                      }) {
    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: "1440px",
                mx: "auto",
                px: { xs: 2, sm: 3, lg: 4 },
                py: { xs: 3, lg: 4 }
            }}
        >
            {children}
        </Box>
    );
}
