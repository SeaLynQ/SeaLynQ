
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
    Plus, Search, RefreshCw, Pencil, Trash2, Ship, X
} from "lucide-react";
import { auth } from "../config/firebase";

type BoatStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

interface Boat {
    id: string;
    boatName: string;
    registrationNumber: string;
    ownerName: string;
    contactNumber: string;
    boatType: string;
    capacity: number;
    status: BoatStatus;
    createdAt?: string | { _seconds?: number; seconds?: number };
}

interface BoatForm {
    boatName: string;
    registrationNumber: string;
    ownerName: string;
    contactNumber: string;
    boatType: string;
    capacity: string;
    status: BoatStatus;
}

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const API_URL = `${API_BASE_URL}/boats`;

const emptyForm: BoatForm = {
    boatName: "",
    registrationNumber: "",
    ownerName: "",
    contactNumber: "",
    boatType: "",
    capacity: "",
    status: "ACTIVE"
};

function formatDate(value?: Boat["createdAt"]): string {
    if (!value) return "—";

    let date: Date;

    if (typeof value === "string") {
        date = new Date(value);
    } else {
        const seconds = value._seconds ?? value.seconds;
        if (seconds === undefined) return "—";
        date = new Date(seconds * 1000);
    }

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN");
}

function Boats() {
    const [boats, setBoats] = useState<Boat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
    const [form, setForm] = useState<BoatForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    const getToken = async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
            throw new Error("Your session has expired. Please log in again.");
        }

        return currentUser.getIdToken();
    };

    const loadBoats = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = await getToken();

            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to load boats");
            }

            setBoats(result.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load boats");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBoats();
    }, [loadBoats]);

    const openAddModal = () => {
        setEditingBoat(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (boat: Boat) => {
        setEditingBoat(boat);

        setForm({
            boatName: boat.boatName,
            registrationNumber: boat.registrationNumber,
            ownerName: boat.ownerName,
            contactNumber: boat.contactNumber,
            boatType: boat.boatType,
            capacity: String(boat.capacity),
            status: boat.status
        });

        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setEditingBoat(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            setSaving(true);

            const token = await getToken();

            const payload = {
                boatName: form.boatName.trim(),
                registrationNumber: form.registrationNumber.trim(),
                ownerName: form.ownerName.trim(),
                contactNumber: form.contactNumber.trim(),
                boatType: form.boatType.trim(),
                capacity: Number(form.capacity),
                status: form.status
            };

            const url = editingBoat
                ? `${API_URL}/${editingBoat.id}`
                : API_URL;

            const response = await fetch(url, {
                method: editingBoat ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to save boat");
            }

            setModalOpen(false);
            setEditingBoat(null);
            setForm(emptyForm);

            await loadBoats();

            window.alert(
                editingBoat
                    ? "Boat updated successfully."
                    : "Boat registered successfully."
            );
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Unable to save boat"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (boat: Boat) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${boat.boatName} (${boat.registrationNumber})?`
        );

        if (!confirmed) return;

        try {
            const token = await getToken();

            const response = await fetch(`${API_URL}/${boat.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to delete boat");
            }

            await loadBoats();
            window.alert("Boat deleted successfully.");
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Unable to delete boat"
            );
        }
    };

    const filteredBoats = boats.filter(boat => {
        const query = search.toLowerCase();

        const matchesSearch = [
            boat.boatName,
            boat.registrationNumber,
            boat.ownerName,
            boat.boatType
        ].some(value => value.toLowerCase().includes(query));

        const matchesStatus =
            statusFilter === "ALL" || boat.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const activeCount = boats.filter(b => b.status === "ACTIVE").length;
    const inactiveCount = boats.filter(b => b.status === "INACTIVE").length;
    const maintenanceCount = boats.filter(
        b => b.status === "MAINTENANCE"
    ).length;

    return (
        <div className="boats-page">
            <div className="boats-heading">
                <div>
                    <h1>Boats Management</h1>
                    <p>Register and manage boats operating in SeaLynQ.</p>
                </div>

                <div className="boats-heading-actions">
                    <button
                        className="boats-secondary-button"
                        onClick={() => void loadBoats()}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>

                    <button
                        className="boats-primary-button"
                        onClick={openAddModal}
                    >
                        <Plus size={17} />
                        Register Boat
                    </button>
                </div>
            </div>

            {error && (
                <div className="boats-error">
                    {error}
                    <button onClick={() => void loadBoats()}>Retry</button>
                </div>
            )}

            <div className="boats-summary-grid">
                <div className="boats-summary-card">
                    <span>Total Boats</span>
                    <strong>{boats.length}</strong>
                </div>

                <div className="boats-summary-card">
                    <span>Active Boats</span>
                    <strong>{activeCount}</strong>
                </div>

                <div className="boats-summary-card">
                    <span>Inactive Boats</span>
                    <strong>{inactiveCount}</strong>
                </div>

                <div className="boats-summary-card">
                    <span>Under Maintenance</span>
                    <strong>{maintenanceCount}</strong>
                </div>
            </div>

            <div className="boats-toolbar">
                <div className="boats-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search boat, registration or owner..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    aria-label="Filter boats by status"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                </select>
            </div>

            <div className="boats-table-container">
                <table className="boats-table">
                    <thead>
                        <tr>
                            <th>BOAT</th>
                            <th>REGISTRATION</th>
                            <th>OWNER</th>
                            <th>TYPE</th>
                            <th>CAPACITY</th>
                            <th>STATUS</th>
                            <th>REGISTERED</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="boats-empty">
                                    Loading boats...
                                </td>
                            </tr>
                        ) : filteredBoats.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="boats-empty">
                                    {boats.length === 0
                                        ? "No boats registered yet. Click Register Boat to add the first boat."
                                        : "No boats match your search."}
                                </td>
                            </tr>
                        ) : (
                            filteredBoats.map(boat => (
                                <tr key={boat.id}>
                                    <td>
                                        <div className="boat-name-cell">
                                            <Ship size={18} />
                                            <strong>{boat.boatName}</strong>
                                        </div>
                                    </td>
                                    <td>{boat.registrationNumber}</td>
                                    <td>{boat.ownerName}</td>
                                    <td>{boat.boatType}</td>
                                    <td>{boat.capacity}</td>
                                    <td>
                                        <span
                                            className={`boat-status ${boat.status.toLowerCase()}`}
                                        >
                                            {boat.status}
                                        </span>
                                    </td>
                                    <td>{formatDate(boat.createdAt)}</td>
                                    <td>
                                        <div className="boat-action-buttons">
                                            <button
                                                title="Edit boat"
                                                aria-label="Edit boat"
                                                onClick={() => openEditModal(boat)}
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                title="Delete boat"
                                                aria-label="Delete boat"
                                                className="boat-delete-button"
                                                onClick={() => void handleDelete(boat)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="boats-table-footer">
                Showing {filteredBoats.length} of {boats.length} boats
            </div>

            {modalOpen && (
                <div
                    className="boat-modal-overlay"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <div className="boat-modal">
                        <div className="boat-modal-header">
                            <div>
                                <h2>
                                    {editingBoat ? "Edit Boat" : "Register New Boat"}
                                </h2>
                                <p>Enter the boat's registration information.</p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="boat-form-grid">
                                <label>
                                    Boat Name *
                                    <input
                                        required
                                        value={form.boatName}
                                        onChange={e => setForm({
                                            ...form,
                                            boatName: e.target.value
                                        })}
                                        placeholder="Enter boat name"
                                        maxLength={100}
                                    />
                                </label>

                                <label>
                                    Registration Number *
                                    <input
                                        required
                                        value={form.registrationNumber}
                                        onChange={e => setForm({
                                            ...form,
                                            registrationNumber: e.target.value
                                        })}
                                        placeholder="Enter registration number"
                                        maxLength={50}
                                    />
                                </label>

                                <label>
                                    Owner Name *
                                    <input
                                        required
                                        value={form.ownerName}
                                        onChange={e => setForm({
                                            ...form,
                                            ownerName: e.target.value
                                        })}
                                        placeholder="Enter owner name"
                                        maxLength={100}
                                    />
                                </label>

                                <label>
                                    Contact Number *
                                    <input
                                        required
                                        type="tel"
                                        value={form.contactNumber}
                                        onChange={e => setForm({
                                            ...form,
                                            contactNumber: e.target.value
                                        })}
                                        placeholder="Enter contact number"
                                        maxLength={20}
                                    />
                                </label>

                                <label>
                                    Boat Type *
                                    <select
                                        required
                                        value={form.boatType}
                                        onChange={e => setForm({
                                            ...form,
                                            boatType: e.target.value
                                        })}
                                    >
                                        <option value="">Select boat type</option>
                                        <option value="Fishing Boat">Fishing Boat</option>
                                        <option value="Motor Boat">Motor Boat</option>
                                        <option value="Trawler">Trawler</option>
                                        <option value="Traditional Boat">Traditional Boat</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </label>

                                <label>
                                    Capacity (persons) *
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={form.capacity}
                                        onChange={e => setForm({
                                            ...form,
                                            capacity: e.target.value
                                        })}
                                        placeholder="Enter capacity"
                                    />
                                </label>

                                <label>
                                    Status *
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({
                                            ...form,
                                            status: e.target.value as BoatStatus
                                        })}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                    </select>
                                </label>
                            </div>

                            <div className="boat-modal-actions">
                                <button
                                    type="button"
                                    className="boats-secondary-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="boats-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingBoat
                                            ? "Save Changes"
                                            : "Register Boat"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Boats;
