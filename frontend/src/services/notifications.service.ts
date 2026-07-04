import { apiClient } from "./apiClient.js";

export const notificationsService = {
  async listNotifications() {
    const res: any = await apiClient.get("/notifications");
    return res.data;
  },

  async getUnreadCount() {
    const res: any = await apiClient.get("/notifications/unread-count");
    return res.data;
  },

  async markRead(id: number) {
    const res: any = await apiClient.post(`/notifications/read/${id}`);
    return res.data;
  },

  async markAllRead() {
    const res: any = await apiClient.post("/notifications/read-all");
    return res.data;
  },
};
