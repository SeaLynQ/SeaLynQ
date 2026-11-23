
import { Router } from "express";

import {
    fetchBoats,
    fetchBoatById,
    addBoat,
    editBoat,
    removeBoat
} from "../controllers/boat.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/", fetchBoats);
router.get("/:id", fetchBoatById);
router.post("/", addBoat);
router.put("/:id", editBoat);
router.delete("/:id", removeBoat);

export default router;
