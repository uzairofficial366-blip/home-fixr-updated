import { Router } from "express";
import {
  getProviderProfile,
  updateProviderProfile,
  uploadVerificationDocument,
  submitVerification,
  listAppliedJobs,
  getPublicProviderProfile,
} from "../controllers/provider.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.get("/profile", authenticateUser, getProviderProfile);
router.post("/profile", authenticateUser, updateProviderProfile);
router.post("/document", authenticateUser, uploadVerificationDocument);
router.post("/verification", authenticateUser, submitVerification);
router.get("/applied", authenticateUser, listAppliedJobs);
router.get("/public/:id", getPublicProviderProfile);

export default router;
