import { Router } from "express";
import { listMessages, sendMessage } from "../controllers/messages.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.get("/job/:jobId", authenticateUser, listMessages);
router.post("/job/:jobId", authenticateUser, sendMessage);

export default router;
