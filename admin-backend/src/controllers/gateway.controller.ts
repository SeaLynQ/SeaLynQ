
import { Request, Response } from "express";
import {
    getAllGateways,
    getGatewayById,
    createGateway,
    updateGateway,
    deleteGateway,
    GatewayInput
} from "../services/gateway.service";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Internal server error";
}

export async function fetchGateways(req: Request, res: Response) {
    try {
        const gateways = await getAllGateways();

        res.status(200).json({
            success: true,
            data: gateways
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: getErrorMessage(error)
        });
    }
}

export async function fetchGatewayById(req: Request, res: Response) {
    try {
        const gatewayId = String(req.params.id);
        const gateway = await getGatewayById(gatewayId);

        if (!gateway) {
            res.status(404).json({
                success: false,
                message: "Gateway not found"
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: gateway
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: getErrorMessage(error)
        });
    }
}

export async function addGateway(req: AuthenticatedRequest, res: Response) {
    try {
        const gateway = await createGateway(req.body as GatewayInput);

        res.status(201).json({
            success: true,
            message: "Gateway registered successfully",
            data: gateway
        });
    } catch (error) {
        const message = getErrorMessage(error);

        const status =
            message === "DUPLICATE_GATEWAY_ID" ? 409 :
            message === "BOAT_NOT_FOUND" ? 404 :
            message.includes("required") || message.includes("status") ? 400 :
            500;

        res.status(status).json({ success: false, message });
    }
}

export async function editGateway(req: AuthenticatedRequest, res: Response) {
    try {
        const gatewayId = String(req.params.id);

        const gateway = await updateGateway(
            gatewayId,
            req.body as GatewayInput
        );

        res.status(200).json({
            success: true,
            message: "Gateway updated successfully",
            data: gateway
        });
    } catch (error) {
        const message = getErrorMessage(error);

        const status =
            message === "GATEWAY_NOT_FOUND" || message === "BOAT_NOT_FOUND" ? 404 :
            message === "DUPLICATE_GATEWAY_ID" ? 409 :
            message.includes("required") || message.includes("status") ? 400 :
            500;

        res.status(status).json({ success: false, message });
    }
}

export async function removeGateway(req: AuthenticatedRequest, res: Response) {
    try {
        const gatewayId = String(req.params.id);

        await deleteGateway(gatewayId);

        res.status(200).json({
            success: true,
            message: "Gateway deleted successfully"
        });
    } catch (error) {
        const message = getErrorMessage(error);

        res.status(message === "GATEWAY_NOT_FOUND" ? 404 : 500)
            .json({ success: false, message });
    }
}
