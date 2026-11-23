
import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
    startSimulator,
    stopSimulator
} from "../controllers/gpsSimulator.controller";

const router = Router();

// Only authenticated ADMIN users can control the simulator
router.use(verifyToken, requireRole("ADMIN"));

router.post("/start", startSimulator);
router.post("/stop", stopSimulator);

export default router;
