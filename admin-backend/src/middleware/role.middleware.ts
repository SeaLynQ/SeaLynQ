
import { Response, NextFunction } from "express";
import { db } from "../config/firebase";
import { AuthenticatedRequest } from "./auth.middleware";

type UserRole = "ADMIN" | "STAFF" | "STUDENT";

export const requireRole = (...allowedRoles: UserRole[]) => {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.user?.uid) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }

            const userDoc = await db
                .collection("users")
                .doc(req.user.uid)
                .get();

            if (!userDoc.exists) {
                res.status(403).json({
                    success: false,
                    message: "User account not found"
                });
                return;
            }

            const userData = userDoc.data();

            if (userData?.status !== "ACTIVE") {
                res.status(403).json({
                    success: false,
                    message: "Your account is inactive"
                });
                return;
            }

            if (!allowedRoles.includes(userData.role as UserRole)) {
                res.status(403).json({
                    success: false,
                    message: "You do not have permission to access this resource"
                });
                return;
            }

            next();
        } catch (error) {
            console.error("Role authorization error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to verify user permissions"
            });
        }
    };
};
