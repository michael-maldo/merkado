import React from "react";
import Box from "@mui/material/Box";

import { Outlet } from "react-router-dom";

export default function AuthLayout() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #10233f 0%, #1b4169 52%, #0c766e 100%)",
                px: 2
            }}
        >
            <Outlet />
        </Box>
    );
}
/*
import {
    Box,
    Paper,
    Typography
} from "@mui/material";

import {
    Outlet
} from "react-router-dom";

export default function AuthLayout() {

    return (

        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "background.default",
                p: 2
            }}
        >

            <Paper
                elevation={3}
                sx={{
                    width: "100%",
                    maxWidth: 450,
                    p: 4,
                    borderRadius: 2
                }}
            >

                <Box
                    sx={{
                        textAlign: "center",
                        mb: 4
                    }}
                >

                    <Typography
                        variant="h4"
                        color="primary"
                        fontWeight={700}
                    >
                        MERKADO
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        Merchandising Platform
                    </Typography>

                </Box>

                <Outlet />

            </Paper>

        </Box>
    );
}

 */
