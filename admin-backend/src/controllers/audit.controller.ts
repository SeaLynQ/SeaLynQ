
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getAllAuditLogs } from "../services/audit.service";

export const fetchAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const logs = await getAllAuditLogs();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch audit logs"
    });
  }
};
