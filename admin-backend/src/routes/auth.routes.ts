
import { Router } from "express";
import { getCurrentUser } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Get the currently authenticated user's profile
router.get("/me", verifyToken, getCurrentUser);

export default router;
