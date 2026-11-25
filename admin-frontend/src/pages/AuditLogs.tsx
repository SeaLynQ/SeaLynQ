
import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { auth } from "../config/firebase";

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

interface AuditLog {
    id: string;
    adminUid?: string | null;
    adminEmail?: string | null;
    action?: string | null;
    resource?: string | null;
    resourceId?: string | null;
    details?: string | null;
    timestamp?: string | number | Date | {
        _seconds?: number;
        seconds?: number;
        _nanoseconds?: number;
        nanoseconds?: number;
    };
}

function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            setError("");

            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error("You are not logged in.");
            }

            const token = await currentUser.getIdToken();

            const response = await fetch(
                `${API_BASE_URL}/audit-logs`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to load audit logs."
                );
            }

            setLogs(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const formatTimestamp = (timestamp: AuditLog["timestamp"]) => {
        if (!timestamp) return "Not available";

        let date: Date;

        if (
            typeof timestamp === "number" ||
            typeof timestamp === "string"
        ) {
            date = new Date(timestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            const seconds = timestamp._seconds ?? timestamp.seconds;

            if (seconds === undefined) return "Not available";

            const nanos =
                timestamp._nanoseconds ?? timestamp.nanoseconds ?? 0;

            date = new Date(seconds * 1000 + nanos / 1_000_000);
        }

        return Number.isNaN(date.getTime())
            ? "Not available"
            : date.toLocaleString();
    };

    const filteredLogs = logs.filter((log) => {
        const searchText = search.toLowerCase();

        const admin = String(
            log.adminEmail || log.adminUid || "Unknown admin"
        );
        const resource = String(log.resource || "Unknown resource");
        const details = String(log.details || "");
        const action = String(log.action || "UNKNOWN");

        const matchesSearch =
            admin.toLowerCase().includes(searchText) ||
            resource.toLowerCase().includes(searchText) ||
            details.toLowerCase().includes(searchText);

        const matchesAction =
            actionFilter === "ALL" || action === actionFilter;

        return matchesSearch && matchesAction;
    });

    return (
        <div className="dashboard-page">
            <div className="dashboard-content audit-page">

                <div className="audit-heading">
                    <div>
                        <h1>Audit Logs</h1>
                        <p>
                            Monitor administrative activities across SeaLynQ.
                        </p>
                    </div>

                    <button
                        className="audit-refresh-btn"
                        onClick={loadAuditLogs}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="audit-summary">
                    <div className="stat-card">
                        <div>
                            <p>Total Recorded Activities</p>
                            <h2>{logs.length}</h2>
                        </div>
                    </div>
                </div>

                <div className="audit-toolbar">
                    <div className="audit-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search admin, resource or details..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="ALL">All Actions</option>
                        <option value="READ">Read</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                    </select>
                </div>

                {loading && <p>Loading audit records...</p>}

                {error && (
                    <p role="alert">
                        Unable to load audit logs: {error}
                    </p>
                )}

                {!loading && !error && (
                    <div className="users-table-container audit-table-container">
                        {filteredLogs.length === 0 ? (
                            <p className="audit-empty">
                                No matching audit records found.
                            </p>
                        ) : (
                            <table className="users-table audit-table">
                                <thead>
                                    <tr>
                                        <th>Admin</th>
                                        <th>Action</th>
                                        <th>Resource</th>
                                        <th>Resource ID</th>
                                        <th>Details</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                {log.adminEmail ||
                                                    log.adminUid ||
                                                    "Unknown admin"}
                                            </td>

                                            <td>
                                                <span
                                                    className={`action-badge action-${String(
                                                        log.action || "unknown"
                                                    ).toLowerCase()}`}
                                                >
                                                    {log.action || "UNKNOWN"}
                                                </span>
                                            </td>

                                            <td>
                                                {log.resource || "Unknown resource"}
                                            </td>

                                            <td>{log.resourceId || "—"}</td>
                                            <td>{log.details || "—"}</td>
                                            <td>
                                                {formatTimestamp(log.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {!loading && !error && (
                    <p className="audit-result-count">
                        Showing {filteredLogs.length} of {logs.length} records
                    </p>
                )}

            </div>
        </div>
    );
}

export default AuditLogs;
