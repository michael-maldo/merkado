import apiClient from "../../shared/api/apiClient";

export async function login(payload) {
  const response = await apiClient.post("/auth/login", payload);

  return response.data;
}

export async function me() {
  const response = await apiClient.get("/auth/me");

  return response.data;
}

export async function logout(refreshToken) {
  await apiClient.post("/auth/logout", {
    refreshToken,
  });
}

export async function refresh(refreshToken) {
  const response = await apiClient.post("/auth/refresh", {
    refreshToken,
  });

  return response.data;
}
