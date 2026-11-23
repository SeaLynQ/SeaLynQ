
import { db } from "../config/firebase";

export type SupportCategory =
    | "TECHNICAL"
    | "ACCOUNT"
    | "BOAT"
    | "DEVICE"
    | "OTHER";

export type SupportPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

export type SupportStatus =
    | "OPEN"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "CLOSED";

export interface CreateTicketInput {
    subject: string;
    description: string;
    category: SupportCategory;
    priority?: SupportPriority;
}

export interface SupportTicket {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    category: SupportCategory;
    priority: SupportPriority;
    status: SupportStatus;
    userId: string;
    userName: string;
    userEmail: string;
    assignedTo: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TicketMessage {
    id: string;
    senderId: string;
    senderRole: string;
    message: string;
    createdAt: Date;
}

const TICKETS = "support_tickets";

const toDate = (value: any): Date => {
    if (value?.toDate) return value.toDate();
    return new Date(value);
};

const toTicket = (
    id: string,
    data: FirebaseFirestore.DocumentData
): SupportTicket => ({
    id,
    ticketNumber: data.ticketNumber,
    subject: data.subject,
    description: data.description,
    category: data.category,
    priority: data.priority,
    status: data.status,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    assignedTo: data.assignedTo ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
});

const toMessage = (
    id: string,
    data: FirebaseFirestore.DocumentData
): TicketMessage => ({
    id,
    senderId: data.senderId,
    senderRole: data.senderRole,
    message: data.message,
    createdAt: toDate(data.createdAt)
});

const validateTicket = (input: CreateTicketInput): void => {
    const validCategories = [
        "TECHNICAL",
        "ACCOUNT",
        "BOAT",
        "DEVICE",
        "OTHER"
    ];

    const validPriorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ];

    if (!input.subject?.trim()) {
        throw new Error("Ticket subject is required.");
    }

    if (input.subject.trim().length > 150) {
        throw new Error("Subject cannot exceed 150 characters.");
    }

    if (!input.description?.trim()) {
        throw new Error("Ticket description is required.");
    }

    if (input.description.trim().length > 3000) {
        throw new Error("Description cannot exceed 3000 characters.");
    }

    if (!validCategories.includes(input.category)) {
        throw new Error("Invalid support category.");
    }

    if (
        input.priority &&
        !validPriorities.includes(input.priority)
    ) {
        throw new Error("Invalid support priority.");
    }
};

// Create a ticket on behalf of an authenticated user.
export const createTicket = async (
    input: CreateTicketInput,
    userId: string
): Promise<SupportTicket> => {
    validateTicket(input);

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
        throw new Error("User profile not found.");
    }

    const user = userDoc.data()!;

    const ticketRef = db.collection(TICKETS).doc();
    const now = new Date();

    const ticketData = {
        ticketNumber: `SLQ-${Date.now()}`,
        subject: input.subject.trim(),
        description: input.description.trim(),
        category: input.category,
        priority: input.priority ?? "MEDIUM",
        status: "OPEN" as SupportStatus,
        userId,
        userName: user.name ?? "Unknown User",
        userEmail: user.email ?? "",
        assignedTo: null,
        createdAt: now,
        updatedAt: now
    };

    await ticketRef.create(ticketData);

    return toTicket(ticketRef.id, ticketData);
};

// Get all tickets for the admin portal.
export const getAllTickets = async (): Promise<SupportTicket[]> => {
    const snapshot = await db
        .collection(TICKETS)
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map(doc =>
        toTicket(doc.id, doc.data())
    );
};

// Get tickets submitted by one user.
export const getUserTickets = async (
    userId: string
): Promise<SupportTicket[]> => {
    const snapshot = await db
        .collection(TICKETS)
        .where("userId", "==", userId)
        .get();

    return snapshot.docs
        .map(doc => toTicket(doc.id, doc.data()))
        .sort(
            (a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
        );
};

// Get one ticket.
export const getTicketById = async (
    id: string
): Promise<SupportTicket | null> => {
    const doc = await db.collection(TICKETS).doc(id).get();

    if (!doc.exists) return null;

    return toTicket(doc.id, doc.data()!);
};

// Update ticket status.
export const updateTicketStatus = async (
    id: string,
    status: SupportStatus,
    adminUid: string
): Promise<SupportTicket> => {
    const validStatuses = [
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED"
    ];

    if (!validStatuses.includes(status)) {
        throw new Error("Invalid ticket status.");
    }

    const ticketRef = db.collection(TICKETS).doc(id);
    const now = new Date();

    await db.runTransaction(async transaction => {
        const ticketDoc = await transaction.get(ticketRef);

        if (!ticketDoc.exists) {
            throw new Error("Support ticket not found.");
        }

        transaction.update(ticketRef, {
            status,
            updatedAt: now,
            lastUpdatedBy: adminUid
        });
    });

    const updatedDoc = await ticketRef.get();

    return toTicket(updatedDoc.id, updatedDoc.data()!);
};

// Assign a ticket to an administrator.
export const assignTicket = async (
    id: string,
    adminId: string
): Promise<SupportTicket> => {
    if (!adminId.trim()) {
        throw new Error("Administrator ID is required.");
    }

    const ticketRef = db.collection(TICKETS).doc(id);

    await ticketRef.update({
        assignedTo: adminId.trim(),
        updatedAt: new Date()
    });

    const updatedDoc = await ticketRef.get();

    return toTicket(updatedDoc.id, updatedDoc.data()!);
};

// Add a message to a ticket conversation.
export const addTicketMessage = async (
    ticketId: string,
    senderId: string,
    senderRole: string,
    message: string
): Promise<TicketMessage> => {
    if (!message?.trim()) {
        throw new Error("Message cannot be empty.");
    }

    if (message.trim().length > 3000) {
        throw new Error("Message cannot exceed 3000 characters.");
    }

    const ticketRef = db.collection(TICKETS).doc(ticketId);
    const messageRef = ticketRef.collection("messages").doc();

    const now = new Date();

    await db.runTransaction(async transaction => {
        const ticketDoc = await transaction.get(ticketRef);

        if (!ticketDoc.exists) {
            throw new Error("Support ticket not found.");
        }

        transaction.create(messageRef, {
            senderId,
            senderRole,
            message: message.trim(),
            createdAt: now
        });

        transaction.update(ticketRef, {
            updatedAt: now
        });
    });

    return {
        id: messageRef.id,
        senderId,
        senderRole,
        message: message.trim(),
        createdAt: now
    };
};

// Get conversation messages.
export const getTicketMessages = async (
    ticketId: string
): Promise<TicketMessage[]> => {
    const ticketRef = db.collection(TICKETS).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
        throw new Error("Support ticket not found.");
    }

    const snapshot = await ticketRef
        .collection("messages")
        .orderBy("createdAt", "asc")
        .get();

    return snapshot.docs.map(doc =>
        toMessage(doc.id, doc.data())
    );
};
