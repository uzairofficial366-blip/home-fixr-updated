import { adminService } from "../services/admin.service.js";

export const adminLogin = async ({ data }: { data: any }) => adminService.login(data);
export const adminGetStats = async () => adminService.getStats();
export const adminGetActivity = async () => adminService.getActivity();
export const adminGetOnlineUsers = async () => adminService.getOnlineUsers();

export const adminListUsers = async ({ data }: { data?: any } = {}) => adminService.listUsers(data);
export const adminSuspendUser = async ({ data }: { data: { userId: number } }) => adminService.suspendUser(data.userId);
export const adminDeleteUser = async ({ data }: { data: { userId: number } }) => adminService.deleteUser(data.userId);

export const adminListProviders = async ({ data }: { data?: any } = {}) => adminService.listProviders(data);
export const adminVerifyProvider = async ({ data }: { data: any }) => adminService.verifyProvider(data);
export const adminSuspendProvider = async ({ data }: { data: { providerId: number } }) => adminService.suspendProvider(data.providerId);

export const adminListJobs = async ({ data }: { data?: any } = {}) => adminService.listJobs(data);
export const adminCancelJob = async ({ data }: { data: { jobId: number } }) => adminService.cancelJob(data.jobId);

export const adminListBids = async ({ data }: { data?: any } = {}) => adminService.listBids(data);

export const adminListPayments = async ({ data }: { data?: any } = {}) => adminService.listPayments(data);
export const adminRefundPayment = async ({ data }: { data: { paymentId: number } }) => adminService.refundPayment(data.paymentId);

export const adminListReviews = async ({ data }: { data?: any } = {}) => adminService.listReviews(data);
export const adminDeleteReview = async ({ data }: { data: { reviewId: number } }) => adminService.deleteReview(data.reviewId);

export const adminListVerifications = async ({ data }: { data?: any } = {}) => adminService.listVerifications(data);

export const adminListCategories = async () => adminService.listCategories();
export const adminCreateCategory = async ({ data }: { data: any }) => adminService.createCategory(data);
export const adminDeleteCategory = async ({ data }: { data: { categoryId: number } }) => adminService.deleteCategory(data.categoryId);

export const adminGetSettings = async () => adminService.getSettings();
export const adminSaveSettings = async ({ data }: { data: any }) => adminService.saveSettings(data);

export const getAdmins = async () => adminService.listAdmins();
export const createAdmin = async ({ data }: { data: any }) => adminService.createAdmin(data);
export const deleteAdmin = async ({ data }: { data: { adminId: number } }) => adminService.deleteAdmin(data.adminId);

export const adminGetReports = async ({ data }: { data?: any } = {}) => adminService.getReports();

export const adminListNotifications = async ({ data }: { data?: any } = {}) => adminService.listNotifications(data);
export const adminGetNotifications = adminListNotifications;
export const adminMarkNotificationRead = async ({ data }: { data: { notificationId: number } }) => adminService.markNotificationRead(data.notificationId);
export const adminMarkAllNotificationsRead = async () => adminService.markAllNotificationsRead();

export const adminUpdateProfile = async ({ data }: { data: any }) => adminService.updateProfile(data);
export const adminChangePassword = async ({ data }: { data: any }) => adminService.changePassword(data);

export const adminGetEscrowDetails = async ({ data }: { data?: any } = {}) => adminService.getEscrowDetails(data);
export const adminGetRevenueDetails = async ({ data }: { data?: any } = {}) => adminService.getRevenueDetails(data);
