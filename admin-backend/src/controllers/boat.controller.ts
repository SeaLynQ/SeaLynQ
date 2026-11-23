
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    getAllBoats,
    getBoatById,
    createBoat,
    updateBoat,
    deleteBoat,
    BoatInput
} from "../services/boat.service";

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Unexpected server error";

const isValidId = (id: unknown): id is string =>
    typeof id === "string" && id.trim().length > 0;

const isValidInput = (body: any): body is BoatInput => {
    return (
        body &&
        typeof body.boatName === "string" &&
        typeof body.registrationNumber === "string" &&
        typeof body.ownerName === "string" &&
        typeof body.contactNumber === "string" &&
        typeof body.boatType === "string" &&
        typeof body.capacity === "number" &&
        Number.isInteger(body.capacity) &&
        body.capacity > 0 &&
        (
            body.status === undefined ||
            ["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(body.status)
        )
    );
};

export const fetchBoats = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const boats = await getAllBoats();

        res.status(200).json({
            success: true,
            count: boats.length,
            data: boats
        });
    } catch (error) {
        console.error("Fetch boats error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch boats"
        });
    }
};

export const fetchBoatById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (!isValidId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid boat ID"
            });
            return;
        }

        const boat = await getBoatById(id);

        if (!boat) {
            res.status(404).json({
                success: false,
                message: "Boat not found"
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: boat
        });
    } catch (error) {
        console.error("Fetch boat error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch boat"
        });
    }
};

export const addBoat = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!isValidInput(req.body)) {
            res.status(400).json({
                success: false,
                message: "Invalid boat details. Check all required fields."
            });
            return;
        }

        const boat = await createBoat(
            req.body,
            req.user!.uid,
            req.user!.email
        );

        res.status(201).json({
            success: true,
            message: "Boat registered successfully",
            data: boat
        });
    } catch (error) {
        const message = getErrorMessage(error);
        const status = message.includes("already exists") ? 409 : 400;

        console.error("Create boat error:", error);

        res.status(status).json({
            success: false,
            message
        });
    }
};

export const editBoat = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (!isValidId(id) || !isValidInput(req.body)) {
            res.status(400).json({
                success: false,
                message: "Invalid boat ID or boat details"
            });
            return;
        }

        const boat = await updateBoat(
            id,
            req.body,
            req.user!.uid,
            req.user!.email
        );

        res.status(200).json({
            success: true,
            message: "Boat updated successfully",
            data: boat
        });
    } catch (error) {
        const message = getErrorMessage(error);
        const status = message === "Boat not found."
            ? 404
            : message.includes("already uses")
                ? 409
                : 400;

        console.error("Update boat error:", error);

        res.status(status).json({
            success: false,
            message
        });
    }
};

export const removeBoat = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = req.params.id;

        if (!isValidId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid boat ID"
            });
            return;
        }

        await deleteBoat(
            id,
            req.user!.uid,
            req.user!.email
        );

        res.status(200).json({
            success: true,
            message: "Boat deleted successfully"
        });
    } catch (error) {
        const message = getErrorMessage(error);
        const status = message === "Boat not found." ? 404 : 500;

        console.error("Delete boat error:", error);

        res.status(status).json({
            success: false,
            message
        });
    }
};
