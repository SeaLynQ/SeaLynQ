
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bell,
    AlertTriangle,
    Ship,
    Cpu,
    Wifi,
    CheckCircle2,
    Clock,
    Search,
    CheckCheck,
    Trash2,
    Info,
    X,
    RefreshCw
} from "lucide-react";

import { auth } from "../config/firebase";
import "./Notifications.css";

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

type NotificationType =
    | "EMERGENCY"
    | "BOAT"
    | "DEVICE"
    | "NETWORK"
    | "SYSTEM";

type NotificationStatus = "UNREAD" | "READ";
type FilterType = "ALL" | "UNREAD" | "READ";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    createdBy: string;
    createdAt: string;
    readAt: string | null;
}

const API_URL = `${API_BASE_URL}/notifications`;

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
    const [search, setSearch] = useState("");

    const [selectedNotification, setSelectedNotification] =
        useState<Notification | null>(null);

    const [actionLoading, setActionLoading] = useState(false);

    const getToken = async (): Promise<string> => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            throw new Error("Your session has expired. Please log in again.");
        }

        return currentUser.getIdToken();
    };

    const loadNotifications = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const token = await getToken();

            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to load notifications."
                );
            }

            setNotifications(result.data ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load notifications."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    const unreadCount = notifications.filter(
        item => item.status === "UNREAD"
    ).length;

    const readCount = notifications.filter(
        item => item.status === "READ"
    ).length;

    const filteredNotifications = useMemo(() => {
        return notifications.filter(item => {
            const matchesFilter =
                activeFilter === "ALL" ||
                item.status === activeFilter;

            const query = search.toLowerCase();

            const matchesSearch =
                item.title.toLowerCase().includes(query) ||
                item.message.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [notifications, activeFilter, search]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "EMERGENCY":
                return <AlertTriangle size={19} />;
            case "BOAT":
                return <Ship size={19} />;
            case "DEVICE":
                return <Cpu size={19} />;
            case "NETWORK":
                return <Wifi size={19} />;
            default:
                return <Info size={19} />;
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const token = await getToken();

            const response = await fetch(`${API_URL}/${id}/read`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to mark notification as read."
                );
            }

            setNotifications(current =>
                current.map(item =>
                    item.id === id
                        ? { ...item, status: "READ", readAt: result.data?.readAt ?? new Date().toISOString() }
                        : item
                )
            );

            setSelectedNotification(current =>
                current?.id === id
                    ? { ...current, status: "READ" }
                    : current
            );
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Unable to update notification."
            );
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;

        try {
            setActionLoading(true);

            const token = await getToken();

            const response = await fetch(`${API_URL}/read-all`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to mark all as read."
                );
            }

            setNotifications(current =>
                current.map(item => ({
                    ...item,
                    status: "READ"
                }))
            );

            setSelectedNotification(current =>
                current ? { ...current, status: "READ" } : null
            );
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Unable to update notifications."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const deleteNotification = async (item: Notification) => {
        const confirmed = window.confirm(
            `Delete "${item.title}" for all administrators?`
        );

        if (!confirmed) return;

        try {
            setActionLoading(true);

            const token = await getToken();

            const response = await fetch(`${API_URL}/${item.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to delete notification."
                );
            }

            setNotifications(current =>
                current.filter(notification => notification.id !== item.id)
            );

            if (selectedNotification?.id === item.id) {
                setSelectedNotification(null);
            }
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Unable to delete notification."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const openNotification = async (item: Notification) => {
        setSelectedNotification(item);

        if (item.status === "UNREAD") {
            await markAsRead(item.id);
        }
    };

    return (
        <div className="notifications-page">

            <div className="notifications-page-header">
                <div>
                    <div className="notifications-title">
                        <Bell size={25} />
                        <h1>Notifications</h1>
                    </div>

                    <p>
                        Monitor alerts, system updates and important activities.
                    </p>
                </div>

                <div className="notification-header-actions">
                    <button
                        className="notification-refresh-btn"
                        onClick={() => void loadNotifications(true)}
                        disabled={loading || refreshing}
                    >
                        <RefreshCw size={16} />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <button
                        className="notification-mark-all-btn"
                        onClick={() => void markAllAsRead()}
                        disabled={unreadCount === 0 || actionLoading}
                    >
                        <CheckCheck size={17} />
                        Mark all as read
                    </button>
                </div>
            </div>

            {error && (
                <div className="notification-error">
                    <span>{error}</span>
                    <button onClick={() => void loadNotifications()}>
                        Retry
                    </button>
                </div>
            )}

            <div className="notification-stats-grid">
                <div className="notification-stat-card">
                    <div className="notification-stat-icon blue">
                        <Bell size={21} />
                    </div>
                    <div>
                        <span>Total Notifications</span>
                        <h2>{notifications.length}</h2>
                    </div>
                </div>

                <div className="notification-stat-card">
                    <div className="notification-stat-icon orange">
                        <Clock size={21} />
                    </div>
                    <div>
                        <span>Unread</span>
                        <h2>{unreadCount}</h2>
                    </div>
                </div>

                <div className="notification-stat-card">
                    <div className="notification-stat-icon green">
                        <CheckCircle2 size={21} />
                    </div>
                    <div>
                        <span>Read</span>
                        <h2>{readCount}</h2>
                    </div>
                </div>
            </div>

            <div className="notification-list-container">
                <div className="notification-list-header">
                    <div>
                        <h2>Recent Notifications</h2>
                        <p>View and manage your system notifications.</p>
                    </div>

                    <div className="notification-search">
                        <Search size={17} />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                        />
                    </div>
                </div>

                <div className="notification-tabs">
                    {(["ALL", "UNREAD", "READ"] as FilterType[]).map(filter => (
                        <button
                            key={filter}
                            className={activeFilter === filter ? "active" : ""}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {filter.charAt(0) + filter.slice(1).toLowerCase()}

                            {filter === "UNREAD" && unreadCount > 0 && (
                                <span className="notification-tab-count">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="notification-list">
                    {loading ? (
                        <div className="notification-empty">
                            <Clock size={28} />
                            <strong>Loading notifications...</strong>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="notification-empty">
                            <Bell size={30} />
                            <strong>No notifications found</strong>
                            <span>
                                {notifications.length === 0
                                    ? "There are no notifications yet."
                                    : "Try changing your search or filter."}
                            </span>
                        </div>
                    ) : (
                        filteredNotifications.map(item => (
                            <div
                                key={item.id}
                                className={`notification-item ${
                                    item.status === "UNREAD" ? "unread" : ""
                                }`}
                            >
                                <div className={`notification-item-icon ${item.type.toLowerCase()}`}>
                                    {getIcon(item.type)}
                                </div>

                                <div
                                    className="notification-item-content"
                                    onClick={() => void openNotification(item)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={event => {
                                        if (event.key === "Enter") {
                                            void openNotification(item);
                                        }
                                    }}
                                >
                                    <div className="notification-item-title">
                                        <strong>{item.title}</strong>

                                        {item.status === "UNREAD" && (
                                            <span className="notification-unread-dot" />
                                        )}
                                    </div>

                                    <p>{item.message}</p>

                                    <span className="notification-item-time">
                                        {formatDate(item.createdAt)}
                                    </span>
                                </div>

                                <div className="notification-item-actions">
                                    {item.status === "UNREAD" && (
                                        <button
                                            title="Mark as read"
                                            aria-label="Mark as read"
                                            onClick={() => void markAsRead(item.id)}
                                            disabled={actionLoading}
                                        >
                                            <CheckCheck size={17} />
                                        </button>
                                    )}

                                    <button
                                        title="Delete notification for all administrators"
                                        aria-label="Delete notification"
                                        onClick={() => void deleteNotification(item)}
                                        disabled={actionLoading}
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="notification-list-footer">
                    Showing {filteredNotifications.length} of {notifications.length} notifications
                </div>
            </div>

            {selectedNotification && (
                <div
                    className="notification-modal-overlay"
                    onClick={() => setSelectedNotification(null)}
                >
                    <div
                        className="notification-modal"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="notification-modal-header">
                            <div>
                                <h2>Notification Details</h2>
                                <p>View notification information.</p>
                            </div>

                            <button
                                onClick={() => setSelectedNotification(null)}
                                className="notification-close-btn"
                                aria-label="Close details"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="notification-detail-content">
                            <div className={`notification-item-icon ${selectedNotification.type.toLowerCase()}`}>
                                {getIcon(selectedNotification.type)}
                            </div>

                            <h3>{selectedNotification.title}</h3>

                            <p>{selectedNotification.message}</p>

                            <div className="notification-detail-meta">
                                <span>Category</span>
                                <strong>
                                    {selectedNotification.type.replace("_", " ")}
                                </strong>
                            </div>

                            <div className="notification-detail-meta">
                                <span>Date and time</span>
                                <strong>
                                    {formatDate(selectedNotification.createdAt)}
                                </strong>
                            </div>

                            <div className="notification-detail-meta">
                                <span>Status</span>
                                <strong>
                                    {selectedNotification.status}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Notifications;
