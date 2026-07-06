import { apiClient } from "./apiClient.js";

export const adminService = {
  async login(data: any) {
    const res: any = await apiClient.post("/admin/login", data);
    if (res?.data?.token) {
      localStorage.setItem("hf_token", res.data.token);
    }
    return res?.data?.user ?? res;
  },


  async getStats() {
    const res: any = await apiClient.get("/admin/stats");
    return res.data;
  },

  async getActivity() {
    const res: any = await apiClient.get("/admin/activity");
    return res.data;
  },

  async getOnlineUsers() {
    const res: any = await apiClient.get("/admin/online-users");
    return res.data;
  },

  async listUsers(params?: { search?: string; role?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/users", { params });
    return res.data;
  },

  async suspendUser(userId: number) {
    const res: any = await apiClient.post("/admin/users/suspend", { userId });
    return res.data;
  },

  async deleteUser(userId: number) {
    const res: any = await apiClient.post("/admin/users/delete", { userId });
    return res.data;
  },

  async listProviders(params?: { search?: string; status?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/providers", { params });
    return res.data;
  },

  async verifyProvider(data: { providerId: number; decision: "verified" | "rejected"; notes?: string }) {
    const res: any = await apiClient.post("/admin/providers/verify", data);
    return res.data;
  },

  async suspendProvider(providerId: number) {
    const res: any = await apiClient.post("/admin/providers/suspend", { providerId });
    return res.data;
  },

  async listJobs(params?: { search?: string; status?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/jobs", { params });
    return res.data;
  },

  async cancelJob(jobId: number) {
    const res: any = await apiClient.post("/admin/jobs/cancel", { jobId });
    return res.data;
  },

  async listBids(params?: { search?: string; status?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/bids", { params });
    return res.data;
  },

  async listPayments(params?: { status?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/payments", { params });
    return res.data;
  },

  async refundPayment(paymentId: number) {
    const res: any = await apiClient.post("/admin/payments/refund", { paymentId });
    return res.data;
  },

  async listReviews(params?: { search?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/reviews", { params });
    return res.data;
  },

  async deleteReview(reviewId: number) {
    const res: any = await apiClient.post("/admin/reviews/delete", { reviewId });
    return res.data;
  },

  async listVerifications(params?: { status?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/verifications", { params });
    return res.data;
  },

  async listCategories() {
    const res: any = await apiClient.get("/admin/categories");
    return res.data;
  },

  async createCategory(data: { name: string; description?: string }) {
    const res: any = await apiClient.post("/admin/categories", data);
    return res.data;
  },

  async deleteCategory(categoryId: number) {
    const res: any = await apiClient.post("/admin/categories/delete", { categoryId });
    return res.data;
  },

  async getSettings() {
    const res: any = await apiClient.get("/admin/settings");
    return res.data;
  },

  async saveSettings(data: Record<string, string>) {
    const res: any = await apiClient.post("/admin/settings", data);
    return res.data;
  },

  async listAdmins() {
    const res: any = await apiClient.get("/admin/admins");
    return res.data;
  },

  async createAdmin(data: any) {
    const res: any = await apiClient.post("/admin/admins", data);
    return res.data;
  },

  async deleteAdmin(adminId: number) {
    const res: any = await apiClient.post("/admin/admins/delete", { adminId });
    return res.data;
  },

  async getReports(params?: { days?: number }) {
    const res: any = await apiClient.get("/admin/reports", { params });
    return res.data;
  },

  async listNotifications(params?: { page?: number }) {
    const res: any = await apiClient.get("/admin/notifications", { params });
    return res.data;
  },

  async markNotificationRead(notificationId: number) {
    const res: any = await apiClient.post("/admin/notifications/read", { notificationId });
    return res.data;
  },

  async markAllNotificationsRead() {
    const res: any = await apiClient.post("/admin/notifications/read-all");
    return res.data;
  },

  async updateProfile(data: { name: string }) {
    const res: any = await apiClient.post("/admin/profile", data);
    return res.data;
  },

  async changePassword(data: any) {
    const res: any = await apiClient.post("/admin/change-password", data);
    return res.data;
  },

  async getEscrowDetails(params?: { page?: number }) {
    const res: any = await apiClient.get("/admin/escrow", { params });
    return res.data;
  },

  async getRevenueDetails(params?: { page?: number }) {
    const res: any = await apiClient.get("/admin/revenue", { params });
    return res.data;
  },

  async listCommissions(params?: { status?: string; search?: string; page?: number }) {
    const res: any = await apiClient.get("/admin/commissions", { params });
    return res.data;
  },

  async reviewCommission(commissionId: number, data: { decision: "paid" | "rejected"; adminNotes?: string }) {
    const res: any = await apiClient.post(`/admin/commissions/${commissionId}/review`, data);
    return res.data;
  },
};

