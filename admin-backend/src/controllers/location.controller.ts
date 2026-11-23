import { updateGpsSimulatorOrigin } from "../services/gpsSimulator.service";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
    getAllBoatLocations,
    updateBoatLocation
} from "../services/location.service";

export const fetchBoatLocations = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const locations = await getAllBoatLocations();

        res.status(200).json({
            success: true,
            count: locations.length,
            data: locations
        });
    } catch (error) {
        console.error("Fetch boat locations error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch boat locations"
        });
    }
};

export const changeBoatLocation = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { boatId, latitude, longitude } = req.body;

        if (
            typeof boatId !== "string" ||
            !boatId.trim() ||
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            res.status(400).json({
                success: false,
                message: "Valid boatId, latitude and longitude are required"
            });
            return;
        }

        await updateBoatLocation(boatId, latitude, longitude);
        updateGpsSimulatorOrigin(boatId, latitude, longitude);

        res.status(200).json({
            success: true,
            message: "Boat location updated successfully"
        });
    } catch (error) {
        console.error("Update boat location error:", error);

        if (error instanceof Error && error.message === "Boat not found") {
            res.status(404).json({
                success: false,
                message: "Boat not found"
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Failed to update boat location"
        });
    }
};
