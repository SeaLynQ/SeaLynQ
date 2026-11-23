
import { auth } from "../config/firebase";

const API_URL = "http://localhost:5000/api/support";

export interface SupportTicket {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    category: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    userId: string;
    userName: string;
    userEmail: string;
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TicketMessage {
    id: string;
    senderId: string;
    senderRole: string;
    message: string;
    createdAt: string;
}

async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("You must be logged in.");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Support API request failed.");
    }

    return result.data;
}

// Get all tickets (Admin/Staff).
export const getAllTickets = (): Promise<SupportTicket[]> =>
    apiRequest("/");

// Get tickets belonging to the logged-in user.
export const getMyTickets = (): Promise<SupportTicket[]> =>
    apiRequest("/my");

// Get one ticket.
export const getTicketById = (id: string): Promise<SupportTicket> =>
    apiRequest(`/${encodeURIComponent(id)}`);

// Create a ticket.
export const createTicket = (data: {
    subject: string;
    description: string;
    category: string;
    priority?: string;
    userId: string;
}) =>
    apiRequest("/", {
        method: "POST",
        body: JSON.stringify(data)
    });

// Get ticket messages.
export const getTicketMessages = (
    ticketId: string
): Promise<TicketMessage[]> =>
    apiRequest(`/${encodeURIComponent(ticketId)}/messages`);

// Send a message.
export const sendTicketMessage = (
    ticketId: string,
    message: string
) =>
    apiRequest(`/${encodeURIComponent(ticketId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ message })
    });

// Update ticket status.
export const updateTicketStatus = (
    ticketId: string,
    status: SupportTicket["status"]
) =>
    apiRequest(`/${encodeURIComponent(ticketId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });

// Assign ticket to an admin.
export const assignTicket = (
    ticketId: string,
    adminId: string
) =>
    apiRequest(`/${encodeURIComponent(ticketId)}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ adminId })
    });
export interface SupportUser {
    uid: string;
    name?: string;
    email: string;
    role: string;
    status: string;
}

export const getSupportUsers = async (): Promise<SupportUser[]> => {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("You are not logged in.");
    }

    const token = await user.getIdToken();

    const response = await fetch("http://localhost:5000/api/users", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load users.");
    }

    return result.data;
};