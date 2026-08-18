import React from 'react';
import {useAuth} from "../identity/hooks/useAuth";
import {Navigate} from "react-router-dom";
import {Box, CircularProgress} from "@mui/material";


export default function HomeRedirect() {
    const {
        isAuthenticated,
        loading
    } = useAuth();

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center"
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Navigate
            to={
                isAuthenticated
                    ? "/dashboard"
                    : "/login"
            }
            replace
        />
    );
}