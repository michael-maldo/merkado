import React from "react";
import {
    createContext,
    useState, useEffect
} from "react";

import {
    login as loginApi,
    me as meApi,
    logout as logoutApi
}
from "../api/authApi"

import {
    tokenService
}
from "../services/tokenService"

export const AuthContext =
    createContext(null);

export function AuthProvider({
    children
}) {

    const [user, setUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        const restore = async () => {
            if (!tokenService.getAccessToken()) { setLoading(false); return; }
            try { setUser(await meApi()); } catch { tokenService.clearTokens(); } finally { setLoading(false); }
        };
        const forcedLogout = () => { setUser(null); setLoading(false); };
        window.addEventListener("merkado:logout", forcedLogout);
        restore();
        return () => window.removeEventListener("merkado:logout", forcedLogout);
    }, []);

    const login = async (username, password) => {
        const authResponse =
            await loginApi({
                username, password
            });
        tokenService.saveTokens(
            authResponse.accessToken,
            authResponse.refreshToken
        );

        const currentUser = await meApi();

        setUser(currentUser);
    

    };

    const logout = async () => {
        const refreshToken = tokenService.getRefreshToken();
        try { if (refreshToken) await logoutApi(refreshToken); } catch { /* local logout still succeeds */ }
        tokenService.clearTokens();
        setUser(null);
    };

    const value = {

        user,

        isAuthenticated:
            !!user,
        
        login,

        logout
        ,loading

    };

    return (

        <AuthContext.Provider
            value={value}
        >

            {children}

        </AuthContext.Provider>
    );
}
