
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Emergencies from "./pages/Emergencies";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Boats from "./pages/Boats";
import Devices from "./pages/Devices";
import Gateways from "./pages/Gateways";
import MeshNetwork from "./pages/MeshNetwork";
import LiveLocation from "./pages/LiveLocation";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import { ThemeProvider } from "./context/ThemeContext";
import Support from "./pages/Support";
import Analytics from "./pages/Analytics";
import Admins from "./pages/Admins";
import Settings from "./pages/Settings";

import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<Login />} />

          {/* Protected admin routes */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/boats" element={<Boats />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/gateways" element={<Gateways />} />
            <Route path="/mesh" element={<MeshNetwork />} />
            <Route path="/locations" element={<LiveLocation />} />
            <Route path="/emergencies" element={<Emergencies />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/support" element={<Support />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
