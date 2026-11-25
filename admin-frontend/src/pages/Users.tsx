
import { useEffect, useState } from "react";
import { Search, RefreshCw, Users as UsersIcon } from "lucide-react";
import { auth } from "../config/firebase";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

interface User {
  uid: string;
  name?: string;
  email: string;
  role: string;
  status: string;
  createdAt?: {
    _seconds?: number;
    seconds?: number;
  } | string;
}

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("You are not logged in.");
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch users."
        );
      }

      setUsers(result.data);
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
const updateUserStatus = async (user: User) => {
  const newStatus = pendingStatus[user.uid];

  if (!newStatus || newStatus === user.status) {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to change ${user.email}'s status from ${user.status} to ${newStatus}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setUpdatingUid(user.uid);
    setError("");

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("You are not logged in.");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(
      `${API_BASE_URL}/users/${user.uid}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to update account status.");
    }

    setUsers((previousUsers) =>
      previousUsers.map((item) =>
        item.uid === user.uid ? result.data : item
      )
    );

    setSelectedUser((previousUser) =>
      previousUser?.uid === user.uid ? result.data : previousUser
    );

    setPendingStatus((previous) => ({
      ...previous,
      [user.uid]: ""
    }));

    alert("Account status updated successfully.");

  } catch (err) {
    alert(
      err instanceof Error
        ? err.message
        : "Unable to update account status."
    );
  } finally {
    setUpdatingUid(null);
  }
};

  useEffect(() => {
    loadUsers();
  }, []);

  const formatDate = (createdAt: User["createdAt"]) => {
    if (!createdAt) return "Not available";

    let date: Date;

    if (typeof createdAt === "string") {
      date = new Date(createdAt);
    } else {
      const seconds = createdAt._seconds ?? createdAt.seconds;

      if (seconds === undefined) return "Not available";

      date = new Date(seconds * 1000);
    }

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString();
  };

  const filteredUsers = users.filter((user) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchText) ||
      user.email.toLowerCase().includes(searchText);

    const matchesRole =
      roleFilter === "ALL" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "ALL" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const suspendedCount = users.filter(
    (user) => user.status === "SUSPENDED"
  ).length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-content users-page">

        <div className="users-heading">
          <div>
            <h1>Users & Fishermen</h1>
            <p>Manage registered users and their account information.</p>
          </div>

          <button
            className="users-refresh-btn"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="users-summary-grid">
          <div className="stat-card">
            <UsersIcon size={22} />
            <div>
              <p>Total Users</p>
              <h2>{users.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Active Users</p>
              <h2>{activeCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Suspended Users</p>
              <h2>{suspendedCount}</h2>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="users-toolbar">
          <div className="users-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
            <option value="STUDENT">Student</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {loading && <p>Loading users...</p>}

        {error && (
          <p role="alert">
            Unable to load users: {error}
          </p>
        )}

        {/* Users table */}
        {!loading && !error && (
          <div className="users-table-container">
            {filteredUsers.length === 0 ? (
              <p className="users-empty">
                No matching users found.
              </p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid}>
                      <td>{user.name || "Not provided"}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>

                      <td>
                        <span
                          className={`user-status status-${user.status.toLowerCase()}`}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td>{formatDate(user.createdAt)}</td>

                    <td>
                      <div className="user-actions">

                        <button
                          className="user-view-btn"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Details
                        </button>

                        {user.uid !== auth.currentUser?.uid && (
                          <div className="user-status-actions">

                            <select
                              value={pendingStatus[user.uid] || user.status}
                              onChange={(e) =>
                                setPendingStatus((previous) => ({
                                  ...previous,
                                  [user.uid]: e.target.value
                                }))
                              }
                              disabled={updatingUid === user.uid}
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="SUSPENDED">Suspended</option>
                            </select>

                            <button
                              className="user-view-btn"
                              onClick={() => updateUserStatus(user)}
                              disabled={
                                updatingUid === user.uid ||
                                !pendingStatus[user.uid] ||
                                pendingStatus[user.uid] === user.status
                              }
                            >
                              {updatingUid === user.uid ? "Updating..." : "Update"}
                            </button>

                          </div>
                        )}

                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && !error && (
          <p className="users-result-count">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}

        {/* User details modal */}
        {selectedUser && (
          <div
            className="user-modal-overlay"
            onClick={() => setSelectedUser(null)}
          >
            <div
              className="user-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="user-modal-header">
                <div>
                  <h2>User Details</h2>
                  <p>Registered account information</p>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close user details"
                >
                  ×
                </button>
              </div>

              <div className="user-detail-list">
                <div>
                  <span>User ID</span>
                  <strong>{selectedUser.uid}</strong>
                </div>

                <div>
                  <span>Name</span>
                  <strong>
                    {selectedUser.name || "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedUser.email}</strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>{selectedUser.role}</strong>
                </div>

                <div>
                  <span>Account Status</span>
                  <strong>{selectedUser.status}</strong>
                </div>

                <div>
                  <span>Registration Date</span>
                  <strong>
                    {formatDate(selectedUser.createdAt)}
                  </strong>
                </div>
              </div>

              <button
                className="user-modal-close"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Users;
