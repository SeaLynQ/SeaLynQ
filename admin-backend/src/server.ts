
import express from "express";
import gatewayRoutes from "./routes/gateway.routes";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import auditRoutes from "./routes/audit.routes";
import boatRoutes from "./routes/boat.routes";
import deviceRoutes from "./routes/device.routes";
import meshRoutes from "./routes/mesh.routes";
import locationRoutes from "./routes/location.routes";
import gpsSimulatorRoutes from "./routes/gpsSimulator.routes";
import emergencyRoutes from "./routes/emergency.routes";
import notificationRoutes from "./routes/notification.routes";
import supportRoutes from "./routes/support.routes";
import settingsRoutes from "./routes/settings.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "SeaLynQ Admin Backend is running",
        timestamp: new Date().toISOString()
    });
});
app.use("/api/dashboard", dashboardRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

app.use("/api/audit-logs", auditRoutes);

app.use("/api/boats", boatRoutes);
app.use("/api/locations", locationRoutes);

app.use("/api/devices", deviceRoutes);
app.use("/api/mesh", meshRoutes);
app.use("/api/gateways", gatewayRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/gps-simulator", gpsSimulatorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/settings", settingsRoutes);

// Start server
// Start server
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`SeaLynQ backend running on port ${PORT}`);
});
