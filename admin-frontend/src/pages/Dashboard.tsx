
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";

export interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminCount: number;
  staffCount: number;
  totalBoats: number;
  totalDevices: number;
  openEmergencies: number;
  openSupportTickets: number;
}

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          throw new Error("You are not logged in.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          "http://localhost:5000/api/dashboard/summary",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load dashboard."
          );
        }

        setSummary(result.data);
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

    loadDashboard();
  }, []);

  const stats = [
    {
      title: "Total Users",
      value: summary?.totalUsers,
      icon: "👥"
    },
    {
      title: "Active Users",
      value: summary?.activeUsers,
      icon: "🟢"
    },
    {
      title: "Inactive Users",
      value: summary?.inactiveUsers,
      icon: "⏸️"
    },
    {
      title: "Administrators",
      value: summary?.adminCount,
      icon: "🛡️"
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        <h1>Overview</h1>
        <p>Monitor and manage the SeaLynQ system.</p>

        {loading && <p>Loading dashboard data...</p>}

        {error && (
          <p role="alert">
            Unable to load dashboard: {error}
          </p>
        )}

        {summary && (
          <div className="dashboard-stats">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.title}>
                <span className="stat-icon">{stat.icon}</span>
                <div>
                  <p>{stat.title}</p>
                  <h2>{stat.value}</h2>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
