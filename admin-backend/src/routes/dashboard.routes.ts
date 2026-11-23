
import { Router } from "express";
import { fetchDashboardSummary } from "../controllers/dashboard.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/summary",
  verifyToken,
  requireRole("ADMIN"),
  fetchDashboardSummary
);

export default router;
