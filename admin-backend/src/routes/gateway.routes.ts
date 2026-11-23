
import { Router } from "express";

import {
    fetchGateways,
    fetchGatewayById,
    addGateway,
    editGateway,
    removeGateway
} from "../controllers/gateway.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/", fetchGateways);
router.get("/:id", fetchGatewayById);
router.post("/", addGateway);
router.put("/:id", editGateway);
router.delete("/:id", removeGateway);

export default router;
