import { Router } from "express";
import { createReview, getJobReview } from "../controllers/reviews.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.post("/", authenticateUser, createReview);
router.get("/job/:jobId", getJobReview);

export default router;
