import { notificationsService } from "../services/notifications.service.js";

export const listNotifications = async () => {
  return notificationsService.listNotifications();
};

export const unreadCount = async () => {
  const res = await notificationsService.getUnreadCount();
  return typeof res === "object" && res !== null ? (res as any).count || 0 : res;
};

export const markRead = async ({ data }: { data: { id: number } | any }) => {
  const id = typeof data === "object" && "id" in data ? data.id : data;
  return notificationsService.markRead(id);
};

export const markAllRead = async () => {
  return notificationsService.markAllRead();
};
