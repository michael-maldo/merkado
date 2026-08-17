import React from "react";
import { ThemeProvider } from "@mui/material/styles";

import CssBaseline from "@mui/material/CssBaseline";

import { appTheme } from "../theme/theme";

import { AuthProvider } from "../identity/context/AuthContext";

export default function Providers({
    children
}) {

    return (

        <ThemeProvider
            theme={appTheme}
        >

            <CssBaseline />

            <AuthProvider>

                {children}
            </AuthProvider>


        </ThemeProvider>
    );
}
