import { Router } from "express";
import { db } from "../config/firebase";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { createAuditLog } from "../services/audit.service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();
const defaults = { organizationName: "SeaLynQ", supportEmail: "", timezone: "Asia/Kolkata", maintenanceMode: false, emergencyAlerts: true, supportNotifications: true };
router.use(verifyToken, requireRole("ADMIN"));
router.get("/", async (_req, res) => {
  try { const doc = await db.collection("settings").doc("general").get(); res.json({ success: true, data: { ...defaults, ...(doc.exists ? doc.data() : {}) } }); }
  catch { res.status(500).json({ success: false, message: "Unable to load settings." }); }
});
router.patch("/", async (request, res) => {
  const req = request as AuthenticatedRequest;
  const input = req.body ?? {};
  const next = {
    organizationName: String(input.organizationName ?? "").trim(),
    supportEmail: String(input.supportEmail ?? "").trim(),
    timezone: String(input.timezone ?? "").trim(),
    maintenanceMode: input.maintenanceMode === true,
    emergencyAlerts: input.emergencyAlerts === true,
    supportNotifications: input.supportNotifications === true
  };
  if (!next.organizationName || !next.timezone || (next.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail))) {
    res.status(400).json({ success: false, message: "Enter a name, valid timezone, and valid support email." }); return;
  }
  try {
    await db.collection("settings").doc("general").set({ ...next, updatedAt: new Date(), updatedBy: req.user!.uid }, { merge: true });
    await createAuditLog({ adminUid: req.user!.uid, adminEmail: req.user!.email, action: "UPDATE", resource: "SETTINGS", resourceId: "general", details: "Updated system settings" });
    res.json({ success: true, data: next });
  } catch { res.status(500).json({ success: false, message: "Unable to save settings." }); }
});
export default router;
