
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
    AlertTriangle,
    Plus,
    Search,
    RefreshCw,
    X,
    Ship,
    Clock,
    CheckCircle,
    Activity,
    MapPin
} from "lucide-react";
import { auth } from "../config/firebase";
import "./Emergencies.css";

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

type EmergencyType =
    | "SOS"
    | "ENGINE_FAILURE"
    | "FIRE"
    | "MEDICAL"
    | "SINKING"
    | "MAN_OVERBOARD"
    | "OTHER";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type EmergencyStatus =
    | "NEW"
    | "ACKNOWLEDGED"
    | "RESPONDING"
    | "RESOLVED";

interface Boat {
    id: string;
    boatName: string;
    registrationNumber: string;
}

interface Emergency {
    id: string;
    boatId: string;
    boatName: string;
    registrationNumber: string;
    type: EmergencyType;
    severity: Severity;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
    status: EmergencyStatus;
    assignedTo?: string | null;
    resolutionNote?: string | null;
    reportedAt: string;
    createdAt: string;
    updatedAt: string;
}

interface EmergencyForm {
    boatId: string;
    type: EmergencyType;
    severity: Severity;
    description: string;
    latitude: string;
    longitude: string;
}

const API_URL = API_BASE_URL;

const emptyForm: EmergencyForm = {
    boatId: "",
    type: "SOS",
    severity: "HIGH",
    description: "",
    latitude: "",
    longitude: ""
};

function formatDate(value?: string): string {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function Emergencies() {
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [boats, setBoats] = useState<Boat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [severityFilter, setSeverityFilter] = useState("ALL");

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<EmergencyForm>(emptyForm);

    const [selectedEmergency, setSelectedEmergency] =
        useState<Emergency | null>(null);

    const [assignedTo, setAssignedTo] = useState("");
    const [resolutionNote, setResolutionNote] = useState("");
    const [updating, setUpdating] = useState(false);

    const getToken = async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            throw new Error("Your session has expired. Please log in again.");
        }

        return currentUser.getIdToken();
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = await getToken();

            const headers = {
                Authorization: `Bearer ${token}`
            };

            const [emergencyResponse, boatResponse] = await Promise.all([
                fetch(`${API_URL}/emergencies`, { headers }),
                fetch(`${API_URL}/boats`, { headers })
            ]);

            const emergencyResult = await emergencyResponse.json();
            const boatResult = await boatResponse.json();

            if (!emergencyResponse.ok) {
                throw new Error(
                    emergencyResult.message || "Unable to load emergencies."
                );
            }

            if (!boatResponse.ok) {
                throw new Error(
                    boatResult.message || "Unable to load boats."
                );
            }

            setEmergencies(emergencyResult.data || []);
            setBoats(boatResult.data || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => ({
        total: emergencies.length,
        new: emergencies.filter(e => e.status === "NEW").length,
        critical: emergencies.filter(
            e => e.severity === "CRITICAL" && e.status !== "RESOLVED"
        ).length,
        resolved: emergencies.filter(e => e.status === "RESOLVED").length
    }), [emergencies]);

    const filteredEmergencies = useMemo(() => {
        return emergencies.filter(emergency => {
            const searchValue = search.toLowerCase();

            const matchesSearch =
                emergency.boatName.toLowerCase().includes(searchValue) ||
                emergency.registrationNumber.toLowerCase().includes(searchValue) ||
                emergency.type.toLowerCase().includes(searchValue) ||
                emergency.description.toLowerCase().includes(searchValue);

            const matchesStatus =
                statusFilter === "ALL" ||
                emergency.status === statusFilter;

            const matchesSeverity =
                severityFilter === "ALL" ||
                emergency.severity === severityFilter;

            return matchesSearch && matchesStatus && matchesSeverity;
        });
    }, [emergencies, search, statusFilter, severityFilter]);

    const updateForm = (
        field: keyof EmergencyForm,
        value: string
    ) => {
        setForm(previous => ({
            ...previous,
            [field]: value
        }));
    };

    const createEmergency = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const token = await getToken();

            const payload = {
                boatId: form.boatId,
                type: form.type,
                severity: form.severity,
                description: form.description.trim(),
                ...(form.latitude.trim() !== ""
                    ? { latitude: Number(form.latitude) }
                    : {}),
                ...(form.longitude.trim() !== ""
                    ? { longitude: Number(form.longitude) }
                    : {})
            };

            if (
                (form.latitude.trim() === "") !==
                (form.longitude.trim() === "")
            ) {
                throw new Error(
                    "Enter both latitude and longitude, or leave both empty."
                );
            }

            const response = await fetch(`${API_URL}/emergencies`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to report emergency."
                );
            }

            setModalOpen(false);
            setForm(emptyForm);
            setSuccess("Emergency reported successfully.");

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to report emergency."
            );
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (
        emergency: Emergency,
        status: EmergencyStatus
    ) => {
        try {
            setUpdating(true);
            setError("");
            setSuccess("");

            const token = await getToken();

            const response = await fetch(
                `${API_URL}/emergencies/${emergency.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status,
                        assignedTo,
                        resolutionNote
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to update emergency."
                );
            }

            setSelectedEmergency(null);
            setAssignedTo("");
            setResolutionNote("");
            setSuccess("Emergency status updated successfully.");

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update emergency."
            );
        } finally {
            setUpdating(false);
        }
    };

    const openDetails = (emergency: Emergency) => {
        setSelectedEmergency(emergency);
        setAssignedTo(emergency.assignedTo || "");
        setResolutionNote(emergency.resolutionNote || "");
        setError("");
    };

    return (
        <div className="emergencies-page">

            <div className="emergency-page-header">
                <div>
                    <div className="emergency-title">
                        <AlertTriangle size={25} />
                        <h1>Emergency Management</h1>
                    </div>
                    <p>
                        Monitor, report and manage maritime emergencies.
                    </p>
                </div>

                <div className="emergency-header-actions">
                    <button
                        className="emergency-refresh-btn"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>

                    <button
                        className="emergency-add-btn"
                        onClick={() => {
                            setError("");
                            setForm(emptyForm);
                            setModalOpen(true);
                        }}
                    >
                        <Plus size={17} />
                        Report Emergency
                    </button>
                </div>
            </div>

            {error && (
                <div className="emergency-alert error">
                    {error}
                    <button onClick={() => setError("")}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {success && (
                <div className="emergency-alert success">
                    {success}
                    <button onClick={() => setSuccess("")}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="emergency-stats-grid">

                <div className="emergency-stat-card">
                    <div className="emergency-stat-icon blue">
                        <Activity size={22} />
                    </div>
                    <div>
                        <span>Total Emergencies</span>
                        <h2>{stats.total}</h2>
                    </div>
                </div>

                <div className="emergency-stat-card">
                    <div className="emergency-stat-icon orange">
                        <Clock size={22} />
                    </div>
                    <div>
                        <span>New Reports</span>
                        <h2>{stats.new}</h2>
                    </div>
                </div>

                <div className="emergency-stat-card">
                    <div className="emergency-stat-icon red">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <span>Critical Active</span>
                        <h2>{stats.critical}</h2>
                    </div>
                </div>

                <div className="emergency-stat-card">
                    <div className="emergency-stat-icon green">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <span>Resolved</span>
                        <h2>{stats.resolved}</h2>
                    </div>
                </div>

            </div>

            <div className="emergency-table-container">

                <div className="emergency-table-header">
                    <div>
                        <h2>Emergency Reports</h2>
                        <p>Review and manage reported incidents.</p>
                    </div>

                    <div className="emergency-filters">
                        <div className="emergency-search">
                            <Search size={17} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search emergencies..."
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="NEW">New</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="RESPONDING">Responding</option>
                            <option value="RESOLVED">Resolved</option>
                        </select>

                        <select
                            value={severityFilter}
                            onChange={e => setSeverityFilter(e.target.value)}
                        >
                            <option value="ALL">All Severities</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
                </div>

                <div className="emergency-table-scroll">
                    <table className="emergency-table">
                        <thead>
                            <tr>
                                <th>Boat</th>
                                <th>Emergency Type</th>
                                <th>Severity</th>
                                <th>Reported At</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="emergency-empty">
                                        Loading emergencies...
                                    </td>
                                </tr>
                            ) : filteredEmergencies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="emergency-empty">
                                        <AlertTriangle size={30} />
                                        <strong>No emergencies found</strong>
                                        <span>
                                            No reports match your current filters.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmergencies.map(emergency => (
                                    <tr key={emergency.id}>
                                        <td>
                                            <div className="emergency-boat-cell">
                                                <Ship size={18} />
                                                <div>
                                                    <strong>{emergency.boatName}</strong>
                                                    <span>{emergency.registrationNumber}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            {emergency.type.replace(/_/g, " ")}
                                        </td>

                                        <td>
                                            <span className={`severity-badge ${emergency.severity.toLowerCase()}`}>
                                                {emergency.severity}
                                            </span>
                                        </td>

                                        <td>{formatDate(emergency.reportedAt)}</td>

                                        <td>
                                            <span className={`emergency-status-badge ${emergency.status.toLowerCase()}`}>
                                                {emergency.status.replace(/_/g, " ")}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className="emergency-view-btn"
                                                onClick={() => openDetails(emergency)}
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="emergency-table-footer">
                    Showing {filteredEmergencies.length} of {emergencies.length} emergencies
                </div>

            </div>

            {modalOpen && (
                <div className="emergency-modal-overlay">
                    <div className="emergency-modal">

                        <div className="emergency-modal-header">
                            <div>
                                <h2>Report New Emergency</h2>
                                <p>Enter the incident details below.</p>
                            </div>

                            <button
                                onClick={() => setModalOpen(false)}
                                className="emergency-close-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={createEmergency}>
                            <div className="emergency-form-grid">

                                <div className="emergency-form-group full">
                                    <label>Select Boat *</label>
                                    <select
                                        required
                                        value={form.boatId}
                                        onChange={e => updateForm("boatId", e.target.value)}
                                    >
                                        <option value="">Choose a boat</option>
                                        {boats.map(boat => (
                                            <option key={boat.id} value={boat.id}>
                                                {boat.boatName} ({boat.registrationNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="emergency-form-group">
                                    <label>Emergency Type *</label>
                                    <select
                                        value={form.type}
                                        onChange={e => updateForm("type", e.target.value)}
                                    >
                                        <option value="SOS">SOS</option>
                                        <option value="ENGINE_FAILURE">Engine Failure</option>
                                        <option value="FIRE">Fire</option>
                                        <option value="MEDICAL">Medical</option>
                                        <option value="SINKING">Sinking</option>
                                        <option value="MAN_OVERBOARD">Man Overboard</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="emergency-form-group">
                                    <label>Severity *</label>
                                    <select
                                        value={form.severity}
                                        onChange={e => updateForm("severity", e.target.value)}
                                    >
                                        <option value="CRITICAL">Critical</option>
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>

                                <div className="emergency-form-group full">
                                    <label>Description *</label>
                                    <textarea
                                        required
                                        maxLength={2000}
                                        rows={4}
                                        placeholder="Describe what happened..."
                                        value={form.description}
                                        onChange={e => updateForm("description", e.target.value)}
                                    />
                                </div>

                                <div className="emergency-form-group">
                                    <label>Latitude (Optional)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="-90"
                                        max="90"
                                        value={form.latitude}
                                        onChange={e => updateForm("latitude", e.target.value)}
                                        placeholder="e.g. 12.9141"
                                    />
                                </div>

                                <div className="emergency-form-group">
                                    <label>Longitude (Optional)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="-180"
                                        max="180"
                                        value={form.longitude}
                                        onChange={e => updateForm("longitude", e.target.value)}
                                        placeholder="e.g. 74.8560"
                                    />
                                </div>

                            </div>

                            <div className="emergency-modal-actions">
                                <button
                                    type="button"
                                    className="emergency-cancel-btn"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="emergency-submit-btn"
                                    disabled={saving}
                                >
                                    {saving ? "Submitting..." : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedEmergency && (
                <div className="emergency-modal-overlay">
                    <div className="emergency-modal">

                        <div className="emergency-modal-header">
                            <div>
                                <h2>Emergency Details</h2>
                                <p>
                                    {selectedEmergency.boatName} · {selectedEmergency.registrationNumber}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedEmergency(null)}
                                className="emergency-close-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="emergency-detail-content">
                            <div className="emergency-detail-row">
                                <span>Emergency Type</span>
                                <strong>{selectedEmergency.type.replace(/_/g, " ")}</strong>
                            </div>

                            <div className="emergency-detail-row">
                                <span>Severity</span>
                                <strong>{selectedEmergency.severity}</strong>
                            </div>

                            <div className="emergency-detail-row">
                                <span>Reported At</span>
                                <strong>{formatDate(selectedEmergency.reportedAt)}</strong>
                            </div>

                            <div className="emergency-detail-description">
                                <span>Description</span>
                                <p>{selectedEmergency.description}</p>
                            </div>

                            {(selectedEmergency.latitude != null &&
                                selectedEmergency.longitude != null) && (
                                <div className="emergency-location-info">
                                    <MapPin size={17} />
                                    {selectedEmergency.latitude}, {selectedEmergency.longitude}
                                </div>
                            )}

                            <div className="emergency-form-group">
                                <label>Assigned To</label>
                                <input
                                    value={assignedTo}
                                    onChange={e => setAssignedTo(e.target.value)}
                                    placeholder="Enter responder name"
                                />
                            </div>

                            <div className="emergency-form-group">
                                <label>Resolution Note</label>
                                <textarea
                                    rows={3}
                                    value={resolutionNote}
                                    onChange={e => setResolutionNote(e.target.value)}
                                    placeholder="Enter resolution details..."
                                />
                            </div>

                            <div className="emergency-form-group">
                                <label>Update Status</label>
                                <select
                                    value={selectedEmergency.status}
                                    onChange={e =>
                                        setSelectedEmergency({
                                            ...selectedEmergency,
                                            status: e.target.value as EmergencyStatus
                                        })
                                    }
                                >
                                    <option value="NEW">New</option>
                                    <option value="ACKNOWLEDGED">Acknowledged</option>
                                    <option value="RESPONDING">Responding</option>
                                    <option value="RESOLVED">Resolved</option>
                                </select>
                            </div>
                        </div>

                        <div className="emergency-modal-actions">
                            <button
                                className="emergency-cancel-btn"
                                onClick={() => setSelectedEmergency(null)}
                            >
                                Close
                            </button>

                            <button
                                className="emergency-submit-btn"
                                disabled={updating}
                                onClick={() =>
                                    updateStatus(selectedEmergency, selectedEmergency.status)
                                }
                            >
                                {updating ? "Updating..." : "Save Changes"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Emergencies;
