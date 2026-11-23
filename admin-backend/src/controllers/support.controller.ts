
import { Response } from "express";
import { db } from "../config/firebase";
import { createAuditLog } from "../services/audit.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

import {
    createTicket,
    getAllTickets,
    getUserTickets,
    getTicketById,
    updateTicketStatus,
    assignTicket,
    addTicketMessage,
    getTicketMessages,
    SupportStatus
} from "../services/support.service";

// Get ticket ID from request parameters.
const getTicketId = (req: AuthenticatedRequest): string => {
    const id = req.params.id;

    if (typeof id !== "string" || !id.trim()) {
        throw new Error("Invalid ticket ID.");
    }

    return id;
};

// Get authenticated user's role.
const getUserRole = async (uid: string): Promise<string> => {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new Error("User profile not found.");
    }

    return userDoc.data()?.role ?? "";
};

// Check whether a user can access a ticket.
const canAccessTicket = (
    role: string,
    uid: string,
    ticket: { userId: string; assignedTo: string | null }
): boolean => {
    if (role === "ADMIN") {
        return true;
    }

    if (role === "STAFF") {
        return ticket.assignedTo === uid;
    }

    if (role === "STUDENT") {
        return ticket.userId === uid;
    }

    return false;
};

// Create a support ticket.
export const submitTicket = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    try {
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const role = await getUserRole(uid);

        const targetUserId =
            role === "ADMIN" ? req.body.userId : uid;

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: "Please select a user."
            });
        }

        if (!["ADMIN", "STAFF", "STUDENT"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Invalid user role."
            });
        }

        const ticket = await createTicket(
            req.body,
            targetUserId
        );

        await createAuditLog({ adminUid: uid, adminEmail: req.user?.email, action: "CREATE", resource: "SUPPORT_TICKET", resourceId: ticket.id, details: `Created support ticket ${ticket.ticketNumber}` });

        return res.status(201).json({
            success: true,
            message: "Support ticket created successfully.",
            data: ticket
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to create support ticket."
        });
    }
};

// Get all tickets for ADMIN and assigned tickets for STAFF.
export const fetchAllTickets = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const uid = req.user!.uid;
        const role = await getUserRole(uid);

        const tickets = await getAllTickets();

        const visibleTickets =
            role === "ADMIN"
                ? tickets
                : role === "STAFF"
                    ? tickets.filter(ticket => ticket.assignedTo === uid)
                    : [];

        res.status(200).json({
            success: true,
            data: visibleTickets
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to fetch support tickets."
        });
    }
};

// Get tickets belonging to the logged-in user.
export const fetchMyTickets = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const tickets = await getUserTickets(req.user!.uid);

        res.status(200).json({
            success: true,
            data: tickets
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to fetch your tickets."
        });
    }
};

// Get one ticket with authorization.
export const fetchTicketById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const ticket = await getTicketById(getTicketId(req));

        if (!ticket) {
            res.status(404).json({
                success: false,
                message: "Support ticket not found."
            });
            return;
        }

        const uid = req.user!.uid;
        const role = await getUserRole(uid);

        if (!canAccessTicket(role, uid, ticket)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to access this ticket."
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: ticket
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to fetch ticket."
        });
    }
};

// Update ticket status (ADMIN only through route middleware).
export const changeTicketStatus = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { status } = req.body as { status: SupportStatus };

        const ticket = await updateTicketStatus(
            getTicketId(req),
            status,
            req.user!.uid
        );

        await createAuditLog({ adminUid: req.user!.uid, adminEmail: req.user!.email, action: "UPDATE", resource: "SUPPORT_TICKET", resourceId: ticket.id, details: `Changed ticket status to ${ticket.status}` });

        res.status(200).json({
            success: true,
            message: "Ticket status updated successfully.",
            data: ticket
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to update ticket status."
        });
    }
};

// Assign ticket to an active STAFF user.
export const assignSupportTicket = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { adminId } = req.body as { adminId: string };

        if (!adminId || typeof adminId !== "string" || !adminId.trim()) {
            res.status(400).json({
                success: false,
                message: "A valid staff user ID is required."
            });
            return;
        }

        const staffDoc = await db
            .collection("users")
            .doc(adminId)
            .get();

        if (!staffDoc.exists) {
            res.status(400).json({
                success: false,
                message: "Staff account not found."
            });
            return;
        }

        const staffData = staffDoc.data();

        if (
            staffData?.role !== "STAFF" ||
            staffData?.status !== "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message: "Selected staff account is invalid or inactive."
            });
            return;
        }

        const ticket = await assignTicket(
            getTicketId(req),
            adminId
        );

        await createAuditLog({ adminUid: req.user!.uid, adminEmail: req.user!.email, action: "UPDATE", resource: "SUPPORT_TICKET", resourceId: ticket.id, details: `Assigned ticket to staff account ${adminId}` });

        res.status(200).json({
            success: true,
            message: "Ticket assigned successfully.",
            data: ticket
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to assign ticket."
        });
    }
};

// Send a message in a ticket conversation.
export const sendTicketMessage = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const uid = req.user!.uid;
        const ticketId = getTicketId(req);

        const ticket = await getTicketById(ticketId);

        if (!ticket) {
            res.status(404).json({
                success: false,
                message: "Support ticket not found."
            });
            return;
        }

        const role = await getUserRole(uid);

        if (!canAccessTicket(role, uid, ticket)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to reply to this ticket."
            });
            return;
        }

        if (!["ADMIN", "STAFF", "STUDENT"].includes(role)) {
            res.status(403).json({
                success: false,
                message: "Invalid user role."
            });
            return;
        }

        const { message } = req.body as { message: string };

        const result = await addTicketMessage(
            ticketId,
            uid,
            role,
            message
        );

        res.status(201).json({
            success: true,
            message: "Reply added successfully.",
            data: result
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to send reply."
        });
    }
};

// Get ticket conversation with authorization.
export const fetchTicketMessages = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const ticketId = getTicketId(req);
        const ticket = await getTicketById(ticketId);

        if (!ticket) {
            res.status(404).json({
                success: false,
                message: "Support ticket not found."
            });
            return;
        }

        const uid = req.user!.uid;
        const role = await getUserRole(uid);

        if (!canAccessTicket(role, uid, ticket)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to view this conversation."
            });
            return;
        }

        const messages = await getTicketMessages(ticketId);

        res.status(200).json({
            success: true,
            data: messages
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to fetch conversation."
        });
    }
};
