import axios from "axios";

import { tokenService } from "../../identity/services/tokenService";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1",

  headers: {
    "Content-Type": "application/json",
  },
});

// Refresh requests must not carry the expired access token that caused the
// original request to fail.
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenService.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshing;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original?._retried ||
      original?.url?.includes("/auth/")
    )
      return Promise.reject(error);
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) return Promise.reject(error);
    original._retried = true;
    refreshing ||= refreshClient
      .post("/auth/refresh", { refreshToken })
      .then(({ data }) => tokenService.saveAccessToken(data.accessToken))
      .catch((refreshError) => {
        tokenService.clearTokens();
        window.dispatchEvent(new Event("merkado:logout"));
        throw refreshError;
      })
      .finally(() => {
        refreshing = null;
      });
    await refreshing;
    return apiClient(original);
  },
);

export default apiClient;
