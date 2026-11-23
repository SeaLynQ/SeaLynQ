
import { Request, Response } from "express";
import {
    getAllDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    DeviceInput
} from "../services/device.service";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Internal server error";
}

export async function fetchDevices(req: Request, res: Response) {
    try {
        const devices = await getAllDevices();
        res.status(200).json({ success: true, data: devices });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: getErrorMessage(error)
        });
    }
}

export async function fetchDeviceById(req: Request, res: Response) {
    try {
        const deviceId = String(req.params.id);
        const device = await getDeviceById(deviceId);

        if (!device) {
            res.status(404).json({ success: false, message: "Device not found" });
            return;
        }

        res.status(200).json({ success: true, data: device });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: getErrorMessage(error)
        });
    }
}

export async function addDevice(req: AuthenticatedRequest, res: Response) {
    try {
        const device = await createDevice(req.body as DeviceInput);

        res.status(201).json({
            success: true,
            message: "Device registered successfully",
            data: device
        });
    } catch (error) {
        const message = getErrorMessage(error);

        const status =
            message === "DUPLICATE_SERIAL_NUMBER" ? 409 :
            message === "BOAT_NOT_FOUND" ? 404 :
            message.includes("required") || message.includes("status") ? 400 :
            500;

        res.status(status).json({ success: false, message });
    }
}

export async function editDevice(req: AuthenticatedRequest, res: Response) {
    try {
        const deviceId = String(req.params.id);
        const device = await updateDevice(deviceId, req.body as DeviceInput);
        res.status(200).json({
            success: true,
            message: "Device updated successfully",
            data: device
        });
    } catch (error) {
        const message = getErrorMessage(error);

        const status =
            message === "DEVICE_NOT_FOUND" || message === "BOAT_NOT_FOUND" ? 404 :
            message === "DUPLICATE_SERIAL_NUMBER" ? 409 :
            message.includes("required") || message.includes("status") ? 400 :
            500;

        res.status(status).json({ success: false, message });
    }
}

export async function removeDevice(req: AuthenticatedRequest, res: Response) {
    try {
       const deviceId = String(req.params.id);
       await deleteDevice(deviceId);

        res.status(200).json({
            success: true,
            message: "Device deleted successfully"
        });
    } catch (error) {
        const message = getErrorMessage(error);

        res.status(message === "DEVICE_NOT_FOUND" ? 404 : 500)
            .json({ success: false, message });
    }
}
