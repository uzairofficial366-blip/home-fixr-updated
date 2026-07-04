import { Router } from "express";
import {
  suggestPrice,
  createJob,
  listMyJobs,
  listOpenJobs,
  getJob,
  getPendingJobBroadcast,
  acceptJobBroadcast,
  customizeJobBroadcastPrice,
  rejectJobBroadcast,
  requestJobCompletion,
  confirmJobCompletion,
} from "../controllers/jobs.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.post("/suggest-price", authenticateUser, suggestPrice);
router.post("/", authenticateUser, createJob);
router.get("/my", authenticateUser, listMyJobs);
router.get("/open", authenticateUser, listOpenJobs);
router.get("/broadcast/pending", authenticateUser, getPendingJobBroadcast);
router.post("/broadcast/accept", authenticateUser, acceptJobBroadcast);
router.post("/broadcast/customize", authenticateUser, customizeJobBroadcastPrice);
router.post("/broadcast/reject", authenticateUser, rejectJobBroadcast);
router.get("/:id", authenticateUser, getJob);
router.post("/request-completion", authenticateUser, requestJobCompletion);
router.post("/confirm-completion", authenticateUser, confirmJobCompletion);

export default router;
