
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
  getAllMeshConnections,
  getMeshConnectionById,
  createMeshConnection,
  updateMeshConnection,
  deleteMeshConnection
} from "../services/mesh.service";

export const fetchMeshConnections = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const connections = await getAllMeshConnections();

    res.status(200).json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error("Fetch mesh connections error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch mesh connections"
    });
  }
};

export const fetchMeshConnectionById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const connection = await getMeshConnectionById(String(req.params.id));

    res.status(200).json({
      success: true,
      data: connection
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch connection";

    res.status(message === "Mesh connection not found" ? 404 : 500).json({
      success: false,
      message
    });
  }
};

export const addMeshConnection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
      return;
    }

    const connection = await createMeshConnection(req.body, {
      uid: req.user.uid,
      email: req.user.email
    });

    res.status(201).json({
      success: true,
      message: "Mesh connection created successfully",
      data: connection
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create connection";

    res.status(400).json({
      success: false,
      message
    });
  }
};

export const editMeshConnection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
      return;
    }

    const connection = await updateMeshConnection(
      String(req.params.id),
      req.body,
      {
        uid: req.user.uid,
        email: req.user.email
      }
    );

    res.status(200).json({
      success: true,
      message: "Mesh connection updated successfully",
      data: connection
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update connection";

    const statusCode =
      message === "Mesh connection not found" ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

export const removeMeshConnection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
      return;
    }

    const result = await deleteMeshConnection(
      String(req.params.id),
      {
        uid: req.user.uid,
        email: req.user.email
      }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete connection";

    res.status(message === "Mesh connection not found" ? 404 : 500).json({
      success: false,
      message
    });
  }
};
