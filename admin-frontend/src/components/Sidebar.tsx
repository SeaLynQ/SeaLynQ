
import {
  LayoutDashboard,
  Users,
  Ship,
  Cpu,
  Wifi,
  Network,
  MapPin,
  AlertTriangle,
  Bell,
  LifeBuoy,
  ChartNoAxesCombined,
  ShieldCheck,
  ClipboardList,
  Settings,
  Anchor,
  X
} from "lucide-react";

import { NavLink } from "react-router-dom";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Users / Fishermen", path: "/users", icon: Users },
  { name: "Boats", path: "/boats", icon: Ship },
  { name: "Devices", path: "/devices", icon: Cpu },
  { name: "Gateways", path: "/gateways", icon: Wifi },
  { name: "Mesh Network", path: "/mesh", icon: Network },
  { name: "Live Location", path: "/locations", icon: MapPin },
  { name: "Emergencies", path: "/emergencies", icon: AlertTriangle },
  { name: "Notifications", path: "/notifications", icon: Bell },
  { name: "Support", path: "/support", icon: LifeBuoy },
  { name: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
  { name: "Admins & Roles", path: "/admins", icon: ShieldCheck },
  { name: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
  { name: "Settings", path: "/settings", icon: Settings }
];

function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Anchor size={23} />
          </div>

          <div className="sidebar-brand-text">
            <h2>SeaLynQ</h2>
            <span>ADMIN PORTAL</span>
          </div>

          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">
          MAIN MENU
        </div>

        <nav className="sidebar-navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={onClose}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-icon">
            <Anchor size={18} />
          </div>

          <div>
            <strong>SeaLynQ</strong>
            <span>Administration System</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
