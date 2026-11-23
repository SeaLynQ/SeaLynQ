
import { useEffect, useMemo, useState } from "react";
import { auth } from "../config/firebase";
import {
  Plus, Search, Pencil, Trash2, X, Cpu, RefreshCw
} from "lucide-react";

const API = "http://localhost:5000/api";

type Status = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

interface Boat {
  id: string;
  boatName: string;
  registrationNumber: string;
}

interface Device {
  id: string;
  deviceName: string;
  serialNumber: string;
  deviceType: string;
  boatId: string;
  status: Status;
  createdAt?: string | { _seconds?: number; seconds?: number };
}

const emptyForm = {
  deviceName: "",
  serialNumber: "",
  deviceType: "",
  boatId: "",
  status: "ACTIVE" as Status
};

function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function getHeaders() {
    const user = auth.currentUser;

    if (!user) throw new Error("Please log in again.");

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

      const [deviceResponse, boatResponse] = await Promise.all([
        fetch(`${API}/devices`, { headers }),
        fetch(`${API}/boats`, { headers })
      ]);

      const deviceResult = await deviceResponse.json();
      const boatResult = await boatResponse.json();

      if (!deviceResponse.ok) {
        throw new Error(deviceResult.message || "Failed to load devices");
      }

      if (!boatResponse.ok) {
        throw new Error(boatResult.message || "Failed to load boats");
      }

      setDevices(deviceResult.data || []);
      setBoats(boatResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const getBoatName = (boatId: string) => {
    const boat = boats.find(item => item.id === boatId);
    return boat
      ? `${boat.boatName} (${boat.registrationNumber})`
      : "Unknown boat";
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = [
        device.deviceName,
        device.serialNumber,
        device.deviceType,
        getBoatName(device.boatId)
      ].join(" ").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filter === "ALL" || device.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [devices, boats, search, filter]);

  const activeCount = devices.filter(d => d.status === "ACTIVE").length;
  const inactiveCount = devices.filter(d => d.status === "INACTIVE").length;
  const maintenanceCount = devices.filter(d => d.status === "MAINTENANCE").length;

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEditModal(device: Device) {
    setForm({
      deviceName: device.deviceName,
      serialNumber: device.serialNumber,
      deviceType: device.deviceType,
      boatId: device.boatId,
      status: device.status
    });

    setEditingId(device.id);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const headers = await getHeaders();

      const url = editingId
        ? `${API}/devices/${editingId}`
        : `${API}/devices`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save device");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadData();

      alert(result.message || "Device saved successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(device: Device) {
    if (!window.confirm(
      `Delete device "${device.deviceName}"? This action cannot be undone.`
    )) return;

    try {
      const headers = await getHeaders();

      const response = await fetch(
        `${API}/devices/${device.id}`,
        { method: "DELETE", headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete device");
      }

      await loadData();
      alert("Device deleted successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to delete device");
    }
  }

  function formatDate(value: Device["createdAt"]) {
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
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Devices Management</h1>
          <p>Register and manage devices assigned to boats.</p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          <Plus size={18} /> Register Device
        </button>
      </div>

      <div className="device-stats">
        <div className="device-stat-card">
          <Cpu size={22} />
          <span>Total Devices</span>
          <strong>{devices.length}</strong>
        </div>
        <div className="device-stat-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="device-stat-card">
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </div>
        <div className="device-stat-card">
          <span>Maintenance</span>
          <strong>{maintenanceCount}</strong>
        </div>
      </div>

      <div className="device-toolbar">
        <div className="device-search">
          <Search size={18} />
          <input
            placeholder="Search device, serial number or boat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>

        <button className="secondary-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="device-error">{error}</div>}

      <div className="device-table-container">
        <table className="device-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Serial Number</th>
              <th>Device Type</th>
              <th>Assigned Boat</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading devices...</td>
              </tr>
            ) : filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={7}>No devices found.</td>
              </tr>
            ) : (
              filteredDevices.map(device => (
                <tr key={device.id}>
                  <td>{device.deviceName}</td>
                  <td>{device.serialNumber}</td>
                  <td>{device.deviceType}</td>
                  <td>{getBoatName(device.boatId)}</td>
                  <td>
                    <span className={`device-status ${device.status.toLowerCase()}`}>
                      {device.status}
                    </span>
                  </td>
                  <td>{formatDate(device.createdAt)}</td>
                  <td>
                    <div className="device-actions">
                      <button
                        title="Edit device"
                        onClick={() => openEditModal(device)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Delete device"
                        onClick={() => handleDelete(device)}
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

      {modalOpen && (
        <div className="device-modal-overlay">
          <div className="device-modal">
            <div className="device-modal-header">
              <h2>{editingId ? "Edit Device" : "Register Device"}</h2>
              <button onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Device Name *</label>
              <input
                required
                value={form.deviceName}
                onChange={e => setForm({
                  ...form, deviceName: e.target.value
                })}
                placeholder="e.g. GPS Tracker"
              />

              <label>Serial Number *</label>
              <input
                required
                value={form.serialNumber}
                onChange={e => setForm({
                  ...form, serialNumber: e.target.value
                })}
                placeholder="e.g. GPS-001"
              />

              <label>Device Type *</label>
              <select
                required
                value={form.deviceType}
                onChange={e => setForm({
                  ...form, deviceType: e.target.value
                })}
              >
                <option value="">Select device type</option>
                <option value="GPS_TRACKER">GPS Tracker</option>
                <option value="SOS_DEVICE">SOS Device</option>
                <option value="ENGINE_SENSOR">Engine Sensor</option>
                <option value="FISH_FINDER">Fish Finder</option>
                <option value="OTHER">Other</option>
              </select>

              <label>Assign to Boat *</label>
              <select
                required
                value={form.boatId}
                onChange={e => setForm({
                  ...form, boatId: e.target.value
                })}
              >
                <option value="">Select boat</option>
                {boats.map(boat => (
                  <option key={boat.id} value={boat.id}>
                    {boat.boatName} ({boat.registrationNumber})
                  </option>
                ))}
              </select>

              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({
                  ...form, status: e.target.value as Status
                })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              <div className="device-modal-actions">
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
                  disabled={saving || boats.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingId ? "Save Changes" : "Register Device"}
                </button>
              </div>

              {boats.length === 0 && (
                <p className="device-error">
                  Register a boat before adding devices.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Devices;
