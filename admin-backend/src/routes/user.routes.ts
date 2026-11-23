
import { Router } from "express";
import {
    fetchAllUsers,
    fetchUserById,
    changeUserStatus,
    changeUserRole
} from "../controllers/user.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

// Get all users (Admin only)
router.get(
    "/",
    verifyToken,
    requireRole("ADMIN"),
    fetchAllUsers
);

// Get a specific user (Admin only)
router.get(
    "/:uid",
    verifyToken,
    requireRole("ADMIN"),
    fetchUserById
);

// Update a user's account status (Admin only)
router.patch(
    "/:uid/status",
    verifyToken,
    requireRole("ADMIN"),
    changeUserStatus
);

router.patch("/:uid/role", verifyToken, requireRole("ADMIN"), changeUserRole);

export default router;
