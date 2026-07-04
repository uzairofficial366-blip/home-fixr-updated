import { Router } from "express";
import {
  createBid,
  listBidsForJob,
  acceptBid,
  declineBid,
} from "../controllers/bids.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.post("/", authenticateUser, createBid);
router.get("/job/:jobId", authenticateUser, listBidsForJob);
router.post("/accept/:bidId", authenticateUser, acceptBid);
router.post("/decline/:bidId", authenticateUser, declineBid);

export default router;
