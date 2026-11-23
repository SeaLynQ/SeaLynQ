
import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
    };
}

export const verifyToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Authentication token is required"
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
            return;
        }

        const decodedToken = await getAuth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);

        res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
};
