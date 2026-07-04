import { Router } from "express";
import { getPayment, holdPayment, releasePayment } from "../controllers/payments.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.get("/job/:jobId", authenticateUser, getPayment);
router.post("/hold", authenticateUser, holdPayment);
router.post("/release", authenticateUser, releasePayment);

export default router;
