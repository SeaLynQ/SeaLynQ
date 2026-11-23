
import { Request, Response } from "express";
import {
    startGpsSimulator,
    stopGpsSimulator
} from "../services/gpsSimulator.service";

export const startSimulator = (_req: Request, res: Response): void => {
    try {
        startGpsSimulator();

        res.status(200).json({
            success: true,
            message: "GPS Simulator started."
        });
    } catch (error) {
        console.error("Error starting GPS simulator:", error);

        res.status(500).json({
            success: false,
            message: "Failed to start GPS Simulator."
        });
    }
};

export const stopSimulator = (_req: Request, res: Response): void => {
    try {
        stopGpsSimulator();

        res.status(200).json({
            success: true,
            message: "GPS Simulator stopped."
        });
    } catch (error) {
        console.error("Error stopping GPS simulator:", error);

        res.status(500).json({
            success: false,
            message: "Failed to stop GPS Simulator."
        });
    }
};
