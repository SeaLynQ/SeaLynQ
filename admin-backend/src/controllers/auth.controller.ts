
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getUserById } from "../services/user.service";

export const getCurrentUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const uid = req.user?.uid;

        if (!uid) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const user = await getUserById(uid);

        if (!user) {
            res.status(403).json({
                success: false,
                message: "User profile not found"
            });
            return;
        }

        if (user.status !== "ACTIVE") {
            res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve user profile"
        });
    }
};
