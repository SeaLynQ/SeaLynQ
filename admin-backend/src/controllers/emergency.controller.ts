
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    getAllEmergencies,
    getEmergencyById,
    createEmergency,
    updateEmergencyStatus,
    EmergencyInput,
    EmergencyStatus
} from "../services/emergency.service";

// GET /api/emergencies
export const fetchEmergencies = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const emergencies = await getAllEmergencies();

        res.status(200).json({
            success: true,
            count: emergencies.length,
            data: emergencies
        });
    } catch (error) {
        console.error("Fetch emergencies error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch emergencies."
        });
    }
};

// GET /api/emergencies/:id
export const fetchEmergencyById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const emergencyId = req.params.id;

        if (typeof emergencyId !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid emergency ID."
            });
            return;
        }

        const emergency = await getEmergencyById(emergencyId);

        if (!emergency) {
            res.status(404).json({
                success: false,
                message: "Emergency not found."
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: emergency
        });
    } catch (error) {
        console.error("Fetch emergency error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch emergency."
        });
    }
};

// POST /api/emergencies
export const addEmergency = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const input = req.body as EmergencyInput;

        const emergency = await createEmergency(
            input,
            req.user!.uid,
            req.user!.email
        );

        res.status(201).json({
            success: true,
            message: "Emergency reported successfully.",
            data: emergency
        });
    } catch (error) {
        console.error("Create emergency error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to create emergency.";

        res.status(400).json({
            success: false,
            message
        });
    }
};

// PATCH /api/emergencies/:id/status
export const changeEmergencyStatus = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const emergencyId = req.params.id;

        if (typeof emergencyId !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid emergency ID."
            });
            return;
        }

        const { status, assignedTo, resolutionNote } = req.body;

        if (!status) {
            res.status(400).json({
                success: false,
                message: "Emergency status is required."
            });
            return;
        }

        const emergency = await updateEmergencyStatus(
            emergencyId,
            status as EmergencyStatus,
            req.user!.uid,
            req.user!.email,
            assignedTo,
            resolutionNote
        );

        res.status(200).json({
            success: true,
            message: "Emergency updated successfully.",
            data: emergency
        });
    } catch (error) {
        console.error("Update emergency error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to update emergency.";

        const statusCode =
            message === "Emergency not found." ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message
        });
    }
};
