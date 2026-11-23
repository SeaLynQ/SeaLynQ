
import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

import {
    submitTicket,
    fetchAllTickets,
    fetchMyTickets,
    fetchTicketById,
    changeTicketStatus,
    assignSupportTicket,
    sendTicketMessage,
    fetchTicketMessages
} from "../controllers/support.controller";

const router = Router();

// All support routes require authentication.
router.use(verifyToken);

// Create a support ticket.
router.post("/", requireRole("ADMIN", "STUDENT", "STAFF"), submitTicket);

// Get tickets belonging to the logged-in user.
router.get("/my", requireRole("STUDENT", "STAFF", "ADMIN"), fetchMyTickets);

// Admin and staff can view all support tickets.
router.get("/", requireRole("ADMIN", "STAFF"), fetchAllTickets);

// Get a particular ticket.
router.get("/:id", requireRole("ADMIN", "STAFF", "STUDENT"), fetchTicketById);

// Get messages for a ticket.
router.get("/:id/messages", requireRole("ADMIN", "STAFF", "STUDENT"), fetchTicketMessages);

// Send a message in a ticket.
router.post("/:id/messages", requireRole("ADMIN", "STAFF", "STUDENT"), sendTicketMessage);

// Admin-only ticket management.
router.patch("/:id/status", requireRole("ADMIN"), changeTicketStatus);
router.patch("/:id/assign", requireRole("ADMIN"), assignSupportTicket);

export default router;
