const ACCESS_TOKEN_KEY = "merkado_access_token";

const REFRESH_TOKEN_KEY = "merkado_refresh_token";

export const tokenService = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  saveTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  saveAccessToken(accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
