
import { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboard.service";

export const fetchDashboardSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const summary = await getDashboardSummary();

    res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      data: summary
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary"
    });
  }
};
