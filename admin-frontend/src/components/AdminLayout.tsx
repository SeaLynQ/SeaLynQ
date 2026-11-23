
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, LogOut, UserCircle } from "lucide-react";
import { signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="topbar-title">
            <h2>SeaLynQ Administration</h2>
            <span>System Management Portal</span>
          </div>

          <div className="topbar-actions">
            <button
              className="header-action"
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle theme"
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}
            </button>

            <div className="admin-profile">
              <UserCircle size={25} />
              <div>
                <strong>Administrator</strong>
                <span>System Admin</span>
              </div>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
