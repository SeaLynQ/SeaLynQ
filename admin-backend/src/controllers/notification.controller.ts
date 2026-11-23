
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    getAllNotifications,
    getNotificationById,
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    NotificationInput
} from "../services/notification.service";

// GET /api/notifications
export const fetchNotifications = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const notifications = await getAllNotifications(req.user!.uid);

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        console.error("Fetch notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications."
        });
    }
};

// GET /api/notifications/:id
export const fetchNotificationById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
            return;
        }

        const notification = await getNotificationById(
            id,
            req.user!.uid
        );

        if (!notification) {
            res.status(404).json({
                success: false,
                message: "Notification not found."
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error("Fetch notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch notification."
        });
    }
};

// POST /api/notifications
export const addNotification = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const input = req.body as NotificationInput;

        const notification = await createNotification(
            input,
            req.user!.uid
        );

        res.status(201).json({
            success: true,
            message: "Notification created successfully.",
            data: notification
        });
    } catch (error) {
        console.error("Create notification error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to create notification.";

        res.status(400).json({
            success: false,
            message
        });
    }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
            return;
        }

        const notification = await markNotificationAsRead(
            id,
            req.user!.uid
        );

        res.status(200).json({
            success: true,
            message: "Notification marked as read.",
            data: notification
        });
    } catch (error) {
        console.error("Mark notification read error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to update notification.";

        res.status(message === "Notification not found." ? 404 : 400).json({
            success: false,
            message
        });
    }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const count = await markAllNotificationsAsRead(
            req.user!.uid
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
            count
        });
    } catch (error) {
        console.error("Mark all notifications read error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read."
        });
    }
};

// DELETE /api/notifications/:id
export const removeNotification = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
            return;
        }

        await deleteNotification(id);

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully."
        });
    } catch (error) {
        console.error("Delete notification error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to delete notification.";

        res.status(message === "Notification not found." ? 404 : 500).json({
            success: false,
            message
        });
    }
};
