
import { useEffect, useMemo, useState } from "react";
import { auth } from "../config/firebase";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Network,
  Cpu,
  Radio,
  Ship,
  RefreshCw,
  Link2
} from "lucide-react";

const API = "http://localhost:5000/api";

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
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

interface Device {
  id: string;
  deviceName: string;
  serialNumber: string;
  deviceType: string;
  boatId: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

interface MeshConnection {
  id: string;
  boatId: string;
  gatewayId: string;
  deviceId: string;
  boatName: string;
  gatewayName: string;
  gatewayCode: string;
  deviceName: string;
  serialNumber: string;
  status: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  updatedAt?: string | { _seconds?: number; seconds?: number };
}

interface ConnectionForm {
  boatId: string;
  gatewayId: string;
  deviceId: string;
}

const emptyForm: ConnectionForm = {
  boatId: "",
  gatewayId: "",
  deviceId: ""
};

function MeshNetwork() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<MeshConnection[]>([]);

  const [form, setForm] = useState<ConnectionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function getHeaders() {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please log in again.");
    }

    const token = await user.getIdToken();

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const headers = await getHeaders();

      const [boatResponse, gatewayResponse, deviceResponse, meshResponse] =
        await Promise.all([
          fetch(`${API}/boats`, { headers }),
          fetch(`${API}/gateways`, { headers }),
          fetch(`${API}/devices`, { headers }),
          fetch(`${API}/mesh`, { headers })
        ]);

      const [boatResult, gatewayResult, deviceResult, meshResult] =
        await Promise.all([
          boatResponse.json(),
          gatewayResponse.json(),
          deviceResponse.json(),
          meshResponse.json()
        ]);

      if (!boatResponse.ok) {
        throw new Error(boatResult.message || "Failed to load boats");
      }

      if (!gatewayResponse.ok) {
        throw new Error(gatewayResult.message || "Failed to load gateways");
      }

      if (!deviceResponse.ok) {
        throw new Error(deviceResult.message || "Failed to load devices");
      }

      if (!meshResponse.ok) {
        throw new Error(meshResult.message || "Failed to load mesh connections");
      }

      setBoats(boatResult.data || []);
      setGateways(gatewayResult.data || []);
      setDevices(deviceResult.data || []);
      setConnections(meshResult.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load mesh network data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredGateways = useMemo(
    () => gateways.filter(gateway => gateway.boatId === form.boatId),
    [gateways, form.boatId]
  );

  const filteredDevices = useMemo(
    () => devices.filter(device => device.boatId === form.boatId),
    [devices, form.boatId]
  );

  const filteredConnections = useMemo(() => {
    return connections.filter(connection => {
      const searchText = [
        connection.boatName,
        connection.gatewayName,
        connection.gatewayCode,
        connection.deviceName,
        connection.serialNumber
      ].join(" ").toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesStatus =
        filter === "ALL" || connection.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [connections, search, filter]);

  const activeGatewayCount = gateways.filter(
    gateway => gateway.status === "ACTIVE"
  ).length;

  const activeDeviceCount = devices.filter(
    device => device.status === "ACTIVE"
  ).length;

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
    setError("");
  }

  function openEditModal(connection: MeshConnection) {
    setForm({
      boatId: connection.boatId,
      gatewayId: connection.gatewayId,
      deviceId: connection.deviceId
    });

    setEditingId(connection.id);
    setModalOpen(true);
    setError("");
  }

  function handleBoatChange(boatId: string) {
    setForm({
      boatId,
      gatewayId: "",
      deviceId: ""
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const headers = await getHeaders();

      const url = editingId
        ? `${API}/mesh/${editingId}`
        : `${API}/mesh`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save connection");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadData();

      alert(result.message || "Mesh connection saved successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(connection: MeshConnection) {
    const confirmed = window.confirm(
      `Remove the connection between "${connection.gatewayName}" and "${connection.deviceName}"?`
    );

    if (!confirmed) return;

    try {
      const headers = await getHeaders();

      const response = await fetch(
        `${API}/mesh/${connection.id}`,
        {
          method: "DELETE",
          headers
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete connection");
      }

      await loadData();
      alert(result.message || "Connection removed successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to delete connection");
    }
  }

  function formatDate(value: MeshConnection["createdAt"]) {
    if (!value) return "—";

    const date =
      typeof value === "string"
        ? new Date(value)
        : new Date((value._seconds ?? value.seconds ?? 0) * 1000);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString();
  }

  return (
    <div className="page-container mesh-page">

      <div className="page-header">
        <div>
          <h1>Mesh Network</h1>
          <p>Manage logical connections between gateways and devices.</p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddModal}
          disabled={gateways.length === 0 || devices.length === 0}
        >
          <Plus size={18} />
          Create Connection
        </button>
      </div>

      {/* Overview cards */}
      <div className="mesh-stats">

        <div className="mesh-stat-card">
          <div className="mesh-stat-icon">
            <Ship size={22} />
          </div>
          <div>
            <span>Total Boats</span>
            <strong>{boats.length}</strong>
          </div>
        </div>

        <div className="mesh-stat-card">
          <div className="mesh-stat-icon">
            <Radio size={22} />
          </div>
          <div>
            <span>Total Gateways</span>
            <strong>{gateways.length}</strong>
            <small>{activeGatewayCount} active</small>
          </div>
        </div>

        <div className="mesh-stat-card">
          <div className="mesh-stat-icon">
            <Cpu size={22} />
          </div>
          <div>
            <span>Total Devices</span>
            <strong>{devices.length}</strong>
            <small>{activeDeviceCount} active</small>
          </div>
        </div>

        <div className="mesh-stat-card">
          <div className="mesh-stat-icon">
            <Link2 size={22} />
          </div>
          <div>
            <span>Configured Connections</span>
            <strong>{connections.length}</strong>
          </div>
        </div>

      </div>

      {/* Network information */}
      <div className="mesh-info">
        <Network size={19} />
        <div>
          <strong>Network configuration</strong>
          <p>
            Connections shown here are manually configured relationships.
            They do not indicate live wireless connectivity.
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mesh-toolbar">

        <div className="mesh-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search boat, gateway or device..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="ALL">All Connections</option>
          <option value="CONFIGURED">Configured</option>
        </select>

        <button className="secondary-btn" onClick={loadData}>
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {error && (
        <div className="mesh-error">
          {error}
        </div>
      )}

      {/* Connections table */}
      <div className="mesh-table-container">
        <table className="mesh-table">
          <thead>
            <tr>
              <th>Boat</th>
              <th>Gateway</th>
              <th>Connected Device</th>
              <th>Serial Number</th>
              <th>Configuration</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading network connections...</td>
              </tr>
            ) : filteredConnections.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  No mesh connections found.
                </td>
              </tr>
            ) : (
              filteredConnections.map(connection => (
                <tr key={connection.id}>
                  <td>
                    <div className="mesh-boat-cell">
                      <Ship size={17} />
                      <div>
                        <strong>{connection.boatName}</strong>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="mesh-node-cell">
                      <Radio size={17} />
                      <div>
                        <strong>{connection.gatewayName}</strong>
                        <small>{connection.gatewayCode}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="mesh-node-cell">
                      <Cpu size={17} />
                      <div>
                        <strong>{connection.deviceName}</strong>
                      </div>
                    </div>
                  </td>

                  <td>{connection.serialNumber}</td>

                  <td>
                    <span className="mesh-config-status">
                      {connection.status}
                    </span>
                  </td>

                  <td>{formatDate(connection.createdAt)}</td>

                  <td>
                    <div className="mesh-actions">
                      <button
                        title="Edit connection"
                        onClick={() => openEditModal(connection)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        title="Delete connection"
                        onClick={() => handleDelete(connection)}
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

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="mesh-modal-overlay">
          <div className="mesh-modal">

            <div className="mesh-modal-header">
              <div>
                <h2>
                  {editingId ? "Edit Connection" : "Create Mesh Connection"}
                </h2>
                <p>Assign a gateway and device to the same boat.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <label>Select Boat *</label>
              <select
                required
                value={form.boatId}
                onChange={e => handleBoatChange(e.target.value)}
              >
                <option value="">Choose a boat</option>

                {boats.map(boat => (
                  <option key={boat.id} value={boat.id}>
                    {boat.boatName} ({boat.registrationNumber})
                  </option>
                ))}
              </select>

              <label>Select Gateway *</label>
              <select
                required
                value={form.gatewayId}
                onChange={e =>
                  setForm({ ...form, gatewayId: e.target.value })
                }
                disabled={!form.boatId}
              >
                <option value="">Choose a gateway</option>

                {filteredGateways.map(gateway => (
                  <option key={gateway.id} value={gateway.id}>
                    {gateway.gatewayName} ({gateway.gatewayId})
                  </option>
                ))}
              </select>

              {form.boatId && filteredGateways.length === 0 && (
                <small className="mesh-field-warning">
                  No gateways are assigned to this boat.
                </small>
              )}

              <label>Select Device *</label>
              <select
                required
                value={form.deviceId}
                onChange={e =>
                  setForm({ ...form, deviceId: e.target.value })
                }
                disabled={!form.boatId}
              >
                <option value="">Choose a device</option>

                {filteredDevices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.deviceName} ({device.serialNumber})
                  </option>
                ))}
              </select>

              {form.boatId && filteredDevices.length === 0 && (
                <small className="mesh-field-warning">
                  No devices are assigned to this boat.
                </small>
              )}

              <div className="mesh-modal-note">
                The selected gateway and device must belong to the same boat.
              </div>

              <div className="mesh-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    saving ||
                    !form.boatId ||
                    !form.gatewayId ||
                    !form.deviceId
                  }
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Connection"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default MeshNetwork;
