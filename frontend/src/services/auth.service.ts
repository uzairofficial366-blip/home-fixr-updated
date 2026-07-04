import { apiClient } from "./apiClient.js";

export const authService = {
  async signup(data: any) {
    // Axios interceptor returns response.data, so res = { success, data }
    const res: any = await apiClient.post("/auth/signup", data);
    if (res?.data?.token) {
      localStorage.setItem("hf_token", res.data.token);
    }
    return res?.data?.user ?? res;
  },

  async login(data: any) {
    const res: any = await apiClient.post("/auth/login", data);
    if (res?.data?.token) {
      localStorage.setItem("hf_token", res.data.token);
    }
    return res?.data?.user ?? res;
  },

  async me() {
    const token = localStorage.getItem("hf_token");
    if (!token) return null;
    try {
      const res: any = await apiClient.get("/auth/me");
      return res?.data ?? res ?? null;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      localStorage.removeItem("hf_token");
    }
    return { ok: true };
  },
};
