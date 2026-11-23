
import { Router } from "express";
import { fetchAuditLogs } from "../controllers/audit.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/",
  verifyToken,
  requireRole("ADMIN"),
  fetchAuditLogs
);

export default router;
