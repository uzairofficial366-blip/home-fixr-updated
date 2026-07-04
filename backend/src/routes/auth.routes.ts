import { Router } from "express";
import { signup, login, me, logout } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticateUser, me);
router.post("/logout", authenticateUser, logout);

export default router;
