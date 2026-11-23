
import { Response } from "express";

import {
    getAllUsers,
    getUserById,
    updateUserStatus,
    UserStatus
} from "../services/user.service";

import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import { db } from "../config/firebase";

// Fetch all users
export const fetchAllUsers = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const users = await getAllUsers();

        await createAuditLog({
            adminUid: req.user!.uid,
            adminEmail: req.user!.email,
            action: "READ",
            resource: "USERS",
            details: "Fetched all user records"
        });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Fetch users error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch users"
        });
    }
};

// Fetch a specific user
export const fetchUserById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const uid = req.params.uid;

        if (typeof uid !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
            return;
        }

        const user = await getUserById(uid);

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        await createAuditLog({
            adminUid: req.user!.uid,
            adminEmail: req.user!.email,
            action: "READ",
            resource: "USERS",
            resourceId: uid,
            details: "Viewed an individual user record"
        });

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("Fetch user error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch user"
        });
    }
};

// Update a user's account status
export const changeUserStatus = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const uid = req.params.uid;
        const { status } = req.body;

        if (typeof uid !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
            return;
        }

        const allowedStatuses: UserStatus[] = [
            "ACTIVE",
            "INACTIVE",
            "SUSPENDED"
        ];

        if (
            typeof status !== "string" ||
            !allowedStatuses.includes(status as UserStatus)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid account status"
            });
            return;
        }

        // Prevent administrators from changing their own status
        if (uid === req.user!.uid) {
            res.status(403).json({
                success: false,
                message: "You cannot change your own account status"
            });
            return;
        }

        const existingUser = await getUserById(uid);

        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        if (existingUser.status === status) {
            res.status(400).json({
                success: false,
                message: "User already has this account status"
            });
            return;
        }

        // Status update and audit log are handled inside the service
        const updatedUser = await updateUserStatus(
            uid,
            status as UserStatus,
            req.user!.uid,
            req.user!.email
        );

        res.status(200).json({
            success: true,
            message: "User account status updated successfully",
            data: updatedUser
        });

    } catch (error) {
        console.error("Update user status error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update user account status"
        });
    }
};

export const changeUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const uid = req.params.uid;
    const role = req.body?.role;
    if (typeof uid !== "string" || !["ADMIN", "STAFF", "STUDENT"].includes(role)) {
        res.status(400).json({ success: false, message: "A valid account role is required." }); return;
    }
    if (uid === req.user!.uid) { res.status(403).json({ success: false, message: "You cannot change your own role." }); return; }
    try {
        const user = await getUserById(uid);
        if (!user) { res.status(404).json({ success: false, message: "User not found." }); return; }
        if (user.role === role) { res.status(400).json({ success: false, message: "User already has this role." }); return; }
        await db.collection("users").doc(uid).update({ role, updatedAt: new Date() });
        await createAuditLog({ adminUid: req.user!.uid, adminEmail: req.user!.email, action: "UPDATE", resource: "USER_ROLE", resourceId: uid, details: `Changed role from ${user.role} to ${role}` });
        res.status(200).json({ success: true, data: { ...user, role } });
    } catch (error) {
        console.error("Update user role error:", error);
        res.status(500).json({ success: false, message: "Unable to update user role." });
    }
};
