
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
    LifeBuoy,
    Ticket,
    Clock,
    CheckCircle2,
    Search,
    Plus,
    MessageSquare,
    X,
    AlertCircle,
    Send,
    RefreshCw
} from "lucide-react";

import {
    getAllTickets,
    getSupportUsers,
    createTicket,
    getTicketMessages,
    sendTicketMessage,
    updateTicketStatus,
    assignTicket,
    type SupportTicket,
    type SupportUser,
    type TicketMessage
} from "../services/supportService";

import "./Support.css";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const Support = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [users, setUsers] = useState<SupportUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");

    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");

    const [selectedTicket, setSelectedTicket] =
        useState<SupportTicket | null>(null);

    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [reply, setReply] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const [newStatus, setNewStatus] = useState<TicketStatus>("OPEN");
    const [assignedUser, setAssignedUser] = useState("");
    const [savingStatus, setSavingStatus] = useState(false);
    const [savingAssignment, setSavingAssignment] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [ticketForm, setTicketForm] = useState({
        userId: "",
        subject: "",
        description: "",
        category: "TECHNICAL",
        priority: "MEDIUM"
    });

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getAllTickets();
            setTickets(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load support tickets."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTickets();
    }, []);

    const loadMessages = async (ticketId: string) => {
        try {
            setMessagesLoading(true);
            const data = await getTicketMessages(ticketId);
            setMessages(data);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Unable to load messages.");
        } finally {
            setMessagesLoading(false);
        }
    };

    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setNewStatus(ticket.status);
        setAssignedUser(ticket.assignedTo || "");
        setReply("");
        setMessages([]);
        await loadMessages(ticket.id);
    };

    const openCreateModal = async () => {
        setShowCreateModal(true);
        setFormError("");
        setUsers([]);

        try {
            const data = await getSupportUsers();

            const eligibleUsers = data.filter(user => {
                const role = String(user.role).trim().toUpperCase();
                const status = String(user.status).trim().toUpperCase();

                return (
                    status === "ACTIVE" &&
                    (role === "STUDENT" || role === "STAFF")
                );
            });

            setUsers(eligibleUsers);
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : "Unable to load users."
            );
        }
    };

    const handleCreateTicket = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setFormError("");

        if (!ticketForm.userId) {
            setFormError("Please select a user.");
            return;
        }

        if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
            setFormError("Subject and description are required.");
            return;
        }

        try {
            setSubmitting(true);

            await createTicket({
                ...ticketForm,
                subject: ticketForm.subject.trim(),
                description: ticketForm.description.trim()
            });

            setTicketForm({
                userId: "",
                subject: "",
                description: "",
                category: "TECHNICAL",
                priority: "MEDIUM"
            });

            setShowCreateModal(false);
            await loadTickets();
            alert("Support ticket created successfully!");
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : "Unable to create ticket."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedTicket) return;

        try {
            setSavingStatus(true);

            await updateTicketStatus(selectedTicket.id, newStatus);

            const updated = { ...selectedTicket, status: newStatus };
            setSelectedTicket(updated);
            setTickets(previous =>
                previous.map(ticket =>
                    ticket.id === updated.id ? updated : ticket
                )
            );

            alert("Ticket status updated.");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Unable to update status.");
        } finally {
            setSavingStatus(false);
        }
    };

    const handleAssignment = async () => {
        if (!selectedTicket || !assignedUser) {
            alert("Select a staff member before assigning.");
            return;
        }

        try {
            setSavingAssignment(true);

            await assignTicket(selectedTicket.id, assignedUser);

            const updated = { ...selectedTicket, assignedTo: assignedUser };
            setSelectedTicket(updated);
            setTickets(previous =>
                previous.map(ticket =>
                    ticket.id === updated.id ? updated : ticket
                )
            );

            alert("Ticket assigned successfully.");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Unable to assign ticket.");
        } finally {
            setSavingAssignment(false);
        }
    };

    const handleReply = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTicket || !reply.trim()) return;

        try {
            setSendingReply(true);

            await sendTicketMessage(selectedTicket.id, reply.trim());
            setReply("");
            await loadMessages(selectedTicket.id);
            await loadTickets();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Unable to send reply.");
        } finally {
            setSendingReply(false);
        }
    };

    const openCount = tickets.filter(t => t.status === "OPEN").length;
    const progressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
    const resolvedCount = tickets.filter(t => t.status === "RESOLVED").length;

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesFilter =
                activeFilter === "ALL" || ticket.status === activeFilter;

            const query = search.toLowerCase();

            const matchesSearch =
                ticket.subject.toLowerCase().includes(query) ||
                (ticket.userName || "").toLowerCase().includes(query) ||
                ticket.id.toLowerCase().includes(query) ||
                (ticket.ticketNumber || "").toLowerCase().includes(query) ||
                (ticket.userEmail || "").toLowerCase().includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [tickets, activeFilter, search]);

    const getStatusClass = (status: string) =>
        status.toLowerCase().replace("_", "-");

    const getPriorityClass = (priority: string) =>
        priority.toLowerCase();

    const formatDate = (date: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleString();
    };

    return (
        <div className="support-page">
            <div className="support-page-header">
                <div>
                    <div className="support-title">
                        <LifeBuoy size={25} />
                        <h1>Support Center</h1>
                    </div>
                    <p>Manage user queries, support tickets and issue resolution.</p>
                </div>

                <button className="support-create-btn" onClick={openCreateModal}>
                    <Plus size={17} />
                    Create Ticket
                </button>
            </div>

            <div className="support-stats-grid">
                <div className="support-stat-card">
                    <div className="support-stat-icon blue">
                        <Ticket size={21} />
                    </div>
                    <div>
                        <span>Total Tickets</span>
                        <h2>{tickets.length}</h2>
                    </div>
                </div>

                <div className="support-stat-card">
                    <div className="support-stat-icon orange">
                        <AlertCircle size={21} />
                    </div>
                    <div>
                        <span>Open Tickets</span>
                        <h2>{openCount}</h2>
                    </div>
                </div>

                <div className="support-stat-card">
                    <div className="support-stat-icon purple">
                        <Clock size={21} />
                    </div>
                    <div>
                        <span>In Progress</span>
                        <h2>{progressCount}</h2>
                    </div>
                </div>

                <div className="support-stat-card">
                    <div className="support-stat-icon green">
                        <CheckCircle2 size={21} />
                    </div>
                    <div>
                        <span>Resolved</span>
                        <h2>{resolvedCount}</h2>
                    </div>
                </div>
            </div>

            <div className="support-list-container">
                <div className="support-list-header">
                    <div>
                        <h2>Support Tickets</h2>
                        <p>View and manage submitted support requests.</p>
                    </div>

                    <div className="support-search">
                        <Search size={17} />
                        <input
                            placeholder="Search tickets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="support-tabs">
                    {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(filter => (
                        <button
                            key={filter}
                            className={activeFilter === filter ? "active" : ""}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {filter.replace("_", " ")}
                        </button>
                    ))}
                </div>

                <div className="support-table-wrapper">
                    <table className="support-table">
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Submitted By</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {!loading && !error && filteredTickets.map(ticket => (
                                <tr key={ticket.id}>
                                    <td>
                                        <strong>{ticket.subject}</strong>
                                        <span className="support-ticket-id">
                                            #{ticket.ticketNumber || ticket.id}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{ticket.userName}</strong>
                                        <span className="support-secondary">
                                            {ticket.userEmail}
                                        </span>
                                    </td>
                                    <td>{ticket.category}</td>
                                    <td>
                                        <span className={`support-priority ${getPriorityClass(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`support-status ${getStatusClass(ticket.status)}`}>
                                            {ticket.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="support-view-btn"
                                            onClick={() => void openTicket(ticket)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="support-empty">
                        <Clock size={32} />
                        <strong>Loading support tickets...</strong>
                    </div>
                )}

                {!loading && error && (
                    <div className="support-empty">
                        <AlertCircle size={32} />
                        <strong>Unable to load tickets</strong>
                        <span>{error}</span>
                        <button className="support-view-btn" onClick={() => void loadTickets()}>
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && filteredTickets.length === 0 && (
                    <div className="support-empty">
                        <MessageSquare size={32} />
                        <strong>No support tickets found</strong>
                        <span>
                            {tickets.length === 0
                                ? "Support requests will appear here when users submit them."
                                : "Try changing your search or filter."}
                        </span>
                    </div>
                )}

                <div className="support-list-footer">
                    Showing {filteredTickets.length} of {tickets.length} tickets
                </div>
            </div>

            {/* Ticket details and management */}
            {selectedTicket && (
                <div
                    className="support-modal-overlay"
                    onClick={() => setSelectedTicket(null)}
                >
                    <div
                        className="support-modal support-details-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="support-modal-header">
                            <div>
                                <h2>Ticket Details</h2>
                                <p>
                                    Ticket #{selectedTicket.ticketNumber || selectedTicket.id}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>

                        <h3>{selectedTicket.subject}</h3>
                        <p>{selectedTicket.description}</p>

                        <div className="support-detail-row">
                            <span>Submitted By</span>
                            <strong>{selectedTicket.userName}</strong>
                        </div>
                        <div className="support-detail-row">
                            <span>Email</span>
                            <strong>{selectedTicket.userEmail}</strong>
                        </div>
                        <div className="support-detail-row">
                            <span>Category</span>
                            <strong>{selectedTicket.category}</strong>
                        </div>
                        <div className="support-detail-row">
                            <span>Priority</span>
                            <strong>{selectedTicket.priority}</strong>
                        </div>
                        <div className="support-detail-row">
                            <span>Created</span>
                            <strong>{formatDate(selectedTicket.createdAt)}</strong>
                        </div>

                        <hr />

                        <h3>Manage Ticket</h3>

                        <label>Update Status</label>
                        <div className="support-action-row">
                            <select
                                value={newStatus}
                                onChange={e => setNewStatus(e.target.value as TicketStatus)}
                            >
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CLOSED">Closed</option>
                            </select>

                            <button
                                className="support-create-btn"
                                disabled={savingStatus || newStatus === selectedTicket.status}
                                onClick={() => void handleStatusUpdate()}
                            >
                                {savingStatus ? "Saving..." : "Update Status"}
                            </button>
                        </div>

                        <label>Assign to Staff</label>
                        <div className="support-action-row">
                            <select
                                value={assignedUser}
                                onChange={e => setAssignedUser(e.target.value)}
                            >
                                <option value="">Select staff member</option>
                                {users
                                    .filter(user =>
                                        String(user.role).toUpperCase() === "STAFF" &&
                                        String(user.status).toUpperCase() === "ACTIVE"
                                    )
                                    .map(user => (
                                        <option key={user.uid} value={user.uid}>
                                            {user.name || user.email}
                                        </option>
                                    ))}
                            </select>

                            <button
                                className="support-create-btn"
                                disabled={savingAssignment || !assignedUser || assignedUser === selectedTicket.assignedTo}
                                onClick={() => void handleAssignment()}
                            >
                                {savingAssignment ? "Assigning..." : "Assign"}
                            </button>
                        </div>

                        <hr />

                        <div className="support-conversation-header">
                            <h3>Conversation</h3>
                            <button
                                className="support-view-btn"
                                onClick={() => void loadMessages(selectedTicket.id)}
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>

                        <div className="support-messages">
                            {messagesLoading && <p>Loading messages...</p>}

                            {!messagesLoading && messages.length === 0 && (
                                <p>No replies yet. Start the conversation below.</p>
                            )}

                            {messages.map(message => (
                                <div className="support-message" key={message.id}>
                                    <div className="support-message-meta">
                                        <strong>{message.senderRole}</strong>
                                        <span>{formatDate(message.createdAt)}</span>
                                    </div>
                                    <p>{message.message}</p>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleReply} className="support-reply-form">
                            <label>Write a Reply</label>
                            <textarea
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                placeholder="Type your response..."
                                rows={3}
                                maxLength={3000}
                                required
                            />
                            <button
                                type="submit"
                                className="support-create-btn"
                                disabled={sendingReply || !reply.trim()}
                            >
                                <Send size={15} />
                                {sendingReply ? "Sending..." : "Send Reply"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create ticket modal */}
            {showCreateModal && (
                <div
                    className="support-modal-overlay"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="support-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="support-modal-header">
                            <div>
                                <h2>Create Support Ticket</h2>
                                <p>Create a ticket on behalf of a user.</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket}>
                            <label>Select User</label>
                            <select
                                value={ticketForm.userId}
                                onChange={e => setTicketForm({
                                    ...ticketForm,
                                    userId: e.target.value
                                })}
                                required
                            >
                                <option value="">Choose a user</option>
                                {users.map(user => (
                                    <option key={user.uid} value={user.uid}>
                                        {user.name || user.email} ({user.role})
                                    </option>
                                ))}
                            </select>

                            {users.length === 0 && !formError && (
                                <p>No active students or staff found.</p>
                            )}

                            <label>Subject</label>
                            <input
                                value={ticketForm.subject}
                                onChange={e => setTicketForm({
                                    ...ticketForm,
                                    subject: e.target.value
                                })}
                                placeholder="Enter ticket subject"
                                maxLength={150}
                                required
                            />

                            <label>Description</label>
                            <textarea
                                value={ticketForm.description}
                                onChange={e => setTicketForm({
                                    ...ticketForm,
                                    description: e.target.value
                                })}
                                placeholder="Describe the issue..."
                                rows={4}
                                required
                            />

                            <label>Category</label>
                            <select
                                value={ticketForm.category}
                                onChange={e => setTicketForm({
                                    ...ticketForm,
                                    category: e.target.value
                                })}
                            >
                                <option value="TECHNICAL">Technical</option>
                                <option value="ACCOUNT">Account</option>
                                <option value="BOAT">Boat</option>
                                <option value="DEVICE">Device</option>
                                <option value="OTHER">Other</option>
                            </select>

                            <label>Priority</label>
                            <select
                                value={ticketForm.priority}
                                onChange={e => setTicketForm({
                                    ...ticketForm,
                                    priority: e.target.value
                                })}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>

                            {formError && (
                                <p className="support-form-error">{formError}</p>
                            )}

                            <button
                                type="submit"
                                className="support-create-btn"
                                disabled={submitting || users.length === 0}
                            >
                                {submitting ? "Creating..." : "Create Ticket"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Support;
