
import { Router } from "express";

import {
    fetchNotifications,
    fetchNotificationById,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification
} from "../controllers/notification.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

// Authentication and ADMIN authorization
router.use(verifyToken);
router.use(requireRole("ADMIN"));

// GET /api/notifications
router.get("/", fetchNotifications);

// PATCH /api/notifications/read-all
// Keep this before /:id routes for clarity.
router.patch("/read-all", markAllAsRead);

// GET /api/notifications/:id
router.get("/:id", fetchNotificationById);

// POST /api/notifications
router.post("/", addNotification);

// PATCH /api/notifications/:id/read
router.patch("/:id/read", markAsRead);

// DELETE /api/notifications/:id
router.delete("/:id", removeNotification);

export default router;
