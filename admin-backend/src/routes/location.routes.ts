
import { Router } from "express";
import {
    fetchBoatLocations,
    changeBoatLocation
} from "../controllers/location.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/", fetchBoatLocations);
router.put("/", changeBoatLocation);

export default router;
