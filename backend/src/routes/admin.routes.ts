import { Router } from "express";
import {
  adminLogin,
  getDashboardStats,
  getRecentActivity,
  getOnlineUsers,
  listUsers,
  suspendUser,
  deleteUser,
  listProviders,
  verifyProvider,
  suspendProvider,
  listAdminJobs,
  cancelJob,
  listAdminBids,
  listAdminPayments,
  refundPayment,
  listAdminReviews,
  deleteReview,
  listVerifications,
  listCategories,
  createCategory,
  deleteCategory,
  getSettings,
  saveSettings,
  listAdmins,
  createAdmin,
  deleteAdmin,
  getReports,
  listAdminNotifications,
  adminMarkNotificationRead,
  adminMarkAllNotificationsRead,
  updateAdminProfile,
  adminChangePassword,
  getEscrowDetails,
  getRevenueDetails,
} from "../controllers/admin.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

const router = Router();

// Public admin login
router.post("/login", adminLogin);

// Protected admin routes
const adminAuth = [authenticateUser, authorizeRoles("admin")];

router.get("/stats", adminAuth, getDashboardStats);
router.get("/activity", adminAuth, getRecentActivity);
router.get("/online-users", adminAuth, getOnlineUsers);

router.get("/users", adminAuth, listUsers);
router.post("/users/suspend", adminAuth, suspendUser);
router.post("/users/delete", adminAuth, deleteUser);

router.get("/providers", adminAuth, listProviders);
router.post("/providers/verify", adminAuth, verifyProvider);
router.post("/providers/suspend", adminAuth, suspendProvider);

router.get("/jobs", adminAuth, listAdminJobs);
router.post("/jobs/cancel", adminAuth, cancelJob);

router.get("/bids", adminAuth, listAdminBids);

router.get("/payments", adminAuth, listAdminPayments);
router.post("/payments/refund", adminAuth, refundPayment);

router.get("/reviews", adminAuth, listAdminReviews);
router.post("/reviews/delete", adminAuth, deleteReview);

router.get("/verifications", adminAuth, listVerifications);

router.get("/categories", adminAuth, listCategories);
router.post("/categories", adminAuth, createCategory);
router.post("/categories/delete", adminAuth, deleteCategory);

router.get("/settings", adminAuth, getSettings);
router.post("/settings", adminAuth, saveSettings);

router.get("/admins", adminAuth, listAdmins);
router.post("/admins", adminAuth, createAdmin);
router.post("/admins/delete", adminAuth, deleteAdmin);

router.get("/reports", adminAuth, getReports);

router.get("/notifications", adminAuth, listAdminNotifications);
router.post("/notifications/read", adminAuth, adminMarkNotificationRead);
router.post("/notifications/read-all", adminAuth, adminMarkAllNotificationsRead);

router.post("/profile", adminAuth, updateAdminProfile);
router.post("/change-password", adminAuth, adminChangePassword);

router.get("/escrow", adminAuth, getEscrowDetails);
router.get("/revenue", adminAuth, getRevenueDetails);

export default router;
