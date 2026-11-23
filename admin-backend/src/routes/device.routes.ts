
import { Router } from "express";

import {
    fetchDevices,
    fetchDeviceById,
    addDevice,
    editDevice,
    removeDevice
} from "../controllers/device.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/", fetchDevices);
router.get("/:id", fetchDeviceById);
router.post("/", addDevice);
router.put("/:id", editDevice);
router.delete("/:id", removeDevice);

export default router;
