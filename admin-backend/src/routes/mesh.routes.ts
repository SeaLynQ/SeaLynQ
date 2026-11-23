
import { Router } from "express";
import {
  fetchMeshConnections,
  fetchMeshConnectionById,
  addMeshConnection,
  editMeshConnection,
  removeMeshConnection
} from "../controllers/mesh.controller";

import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get("/", fetchMeshConnections);
router.get("/:id", fetchMeshConnectionById);
router.post("/", addMeshConnection);
router.put("/:id", editMeshConnection);
router.delete("/:id", removeMeshConnection);

export default router;
