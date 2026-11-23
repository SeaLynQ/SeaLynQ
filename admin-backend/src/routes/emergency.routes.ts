
import { Router } from "express";

import {
    fetchEmergencies,
    fetchEmergencyById,
    addEmergency,
    changeEmergencyStatus
} from "../controllers/emergency.controller";

import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Require a valid Firebase authentication token
router.use(verifyToken);

// GET /api/emergencies
router.get("/", fetchEmergencies);

// GET /api/emergencies/:id
router.get("/:id", fetchEmergencyById);

// POST /api/emergencies
router.post("/", addEmergency);

// PATCH /api/emergencies/:id/status
router.patch("/:id/status", changeEmergencyStatus);

export default router;
