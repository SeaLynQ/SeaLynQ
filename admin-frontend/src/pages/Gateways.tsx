
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, Trash2,
  Radio, X, MapPin, Wifi
} from "lucide-react";
import { auth } from "../config/firebase";

const API = "http://localhost:5000/api";

type Status = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

interface Boat {
  id: string;
  boatName: string;
  registrationNumber: string;
}

interface Gateway {
  id: string;
  gatewayName: string;
  gatewayId: string;
  boatId: string;
  location?: string;
  status: Status;
createdAt?: string | {
  seconds?: number;
  _seconds?: number;
};
}

const emptyForm = {
  gatewayName: "",
  gatewayId: "",
  boatId: "",
  location: "",
  status: "ACTIVE" as Status,
};

function Gateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function request(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please log in again.");

    const token = await user.getIdToken();

    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Request failed");
    }

    return data;
  }

  async function loadData() {
    try {
      setLoading(true);
      const [gatewayData, boatData] = await Promise.all([
        request("/gateways"),
        request("/boats"),
      ]);
      console.log("GATEWAY API:", gatewayData);
      console.log("BOAT API:", boatData);

    setGateways(
      Array.isArray(gatewayData)
        ? gatewayData
        : gatewayData.data || gatewayData.gateways || []
    );
     console.log("FIRST GATEWAY RECORD:", gatewayData.data?.[0]);

    setBoats(
      Array.isArray(boatData)
        ? boatData
        : boatData.data || boatData.boats || []
    );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load gateways");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredGateways = useMemo(() => {
    return gateways.filter((gateway) => {
      const boat = boats.find((item) => item.id === gateway.boatId);
      const text = [
        gateway.gatewayName,
        gateway.gatewayId,
        gateway.location || "",
        boat?.boatName || "",
        boat?.registrationNumber || "",
      ].join(" ").toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (statusFilter === "ALL" || gateway.status === statusFilter)
      );
    });
  }, [gateways, boats, search, statusFilter]);

  const counts = {
    total: gateways.length,
    active: gateways.filter((g) => g.status === "ACTIVE").length,
    inactive: gateways.filter((g) => g.status === "INACTIVE").length,
    maintenance: gateways.filter((g) => g.status === "MAINTENANCE").length,
  };

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(gateway: Gateway) {
    setEditingId(gateway.id);
    setForm({
      gatewayName: gateway.gatewayName,
      gatewayId: gateway.gatewayId,
      boatId: gateway.boatId,
      location: gateway.location || "",
      status: gateway.status,
    });
    setShowModal(true);
  }

  async function saveGateway(event: React.FormEvent) {
    event.preventDefault();

    if (!form.gatewayName.trim() || !form.gatewayId.trim() || !form.boatId) {
      alert("Gateway name, gateway ID and boat are required.");
      return;
    }

    try {
      setSaving(true);

      await request(
        editingId ? `/gateways/${editingId}` : "/gateways",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(form),
        }
      );

      alert(editingId ? "Gateway updated successfully." : "Gateway registered successfully.");
      setShowModal(false);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save gateway");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGateway(gateway: Gateway) {
    if (!window.confirm(`Delete gateway "${gateway.gatewayName}"?`)) return;

    try {
      await request(`/gateways/${gateway.id}`, { method: "DELETE" });
      alert("Gateway deleted successfully.");
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete gateway");
    }
  }

 function formatDate(value?: Gateway["createdAt"]) {
   if (!value) return "—";

   let date: Date;

   if (typeof value === "object") {
     const seconds = value.seconds ?? value._seconds;

     if (seconds === undefined) return "—";

     date = new Date(seconds * 1000);
   } else {
     date = new Date(value);
   }

   if (Number.isNaN(date.getTime())) return "—";

   return date.toLocaleDateString("en-IN", {
     day: "2-digit",
     month: "short",
     year: "numeric",
   });
 }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gateway Management</h1>
          <p>Register and manage SeaLynQ communication gateways.</p>
        </div>
        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} /> Add Gateway
        </button>
      </div>

      <div className="device-stats">
        <div className="device-stat-card">
          <Radio size={22} />
          <div><span>Total Gateways</span><strong>{counts.total}</strong></div>
        </div>
        <div className="device-stat-card">
          <Wifi size={22} />
          <div><span>Active</span><strong>{counts.active}</strong></div>
        </div>
        <div className="device-stat-card">
          <div><span>Inactive</span><strong>{counts.inactive}</strong></div>
        </div>
        <div className="device-stat-card">
          <div><span>Maintenance</span><strong>{counts.maintenance}</strong></div>
        </div>
      </div>

      <div className="device-toolbar">
        <div className="device-search">
          <Search size={18} />
          <input
            placeholder="Search gateway, ID, boat or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>

        <button className="secondary-button" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="device-table-container">
        {loading ? (
          <p className="empty-state">Loading gateways...</p>
        ) : filteredGateways.length === 0 ? (
          <p className="empty-state">No gateways found.</p>
        ) : (
          <table className="device-table">
            <thead>
              <tr>
                <th>Gateway</th>
                <th>Gateway ID</th>
                <th>Assigned Boat</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGateways.map((gateway) => {
                const boat = boats.find((item) => item.id === gateway.boatId);

                return (
                  <tr key={gateway.id}>
                    <td><strong>{gateway.gatewayName}</strong></td>
                    <td>{gateway.gatewayId}</td>
                    <td>
                      {boat
                        ? `${boat.boatName} (${boat.registrationNumber})`
                        : "Unknown boat"}
                    </td>
                    <td>
                      <MapPin size={14} style={{ display: "inline" }} />
                      {" "}{gateway.location || "—"}
                    </td>
                    <td>
                      <span className={`device-status ${gateway.status.toLowerCase()}`}>
                        {gateway.status}
                      </span>
                    </td>
                    <td>{formatDate(gateway.createdAt)}</td>
                    <td>
                      <div className="device-actions">
                        <button onClick={() => openEdit(gateway)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => deleteGateway(gateway)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="device-modal">
            <div className="modal-header">
              <h2>{editingId ? "Edit Gateway" : "Register Gateway"}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={saveGateway}>
              <label>Gateway Name *</label>
              <input
                value={form.gatewayName}
                onChange={(e) => setForm({ ...form, gatewayName: e.target.value })}
                placeholder="e.g. Main Communication Gateway"
                required
              />

              <label>Gateway ID *</label>
              <input
                value={form.gatewayId}
                onChange={(e) => setForm({ ...form, gatewayId: e.target.value })}
                placeholder="e.g. GW-001"
                required
              />

              <label>Assigned Boat *</label>
              <select
                value={form.boatId}
                onChange={(e) => setForm({ ...form, boatId: e.target.value })}
                required
              >
                <option value="">Select a boat</option>
                {boats.map((boat) => (
                  <option key={boat.id} value={boat.id}>
                    {boat.boatName} ({boat.registrationNumber})
                  </option>
                ))}
              </select>

              <label>Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Mangalore Harbour"
              />

              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Gateway" : "Register Gateway"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Gateways;
