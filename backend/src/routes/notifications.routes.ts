import { Router } from "express";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "../controllers/notifications.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticateUser, listNotifications);
router.get("/unread-count", authenticateUser, getUnreadCount);
router.post("/read/:id", authenticateUser, markRead);
router.post("/read-all", authenticateUser, markAllRead);

export default router;
