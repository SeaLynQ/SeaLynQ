
import { auth } from "../config/firebase";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export async function adminRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result.data as T;
}

export interface ManagedUser {
  uid: string;
  name?: string;
  email: string;
  role: "ADMIN" | "STAFF" | "STUDENT";
  status: string;
}

export interface SystemSettings {
  organizationName: string;
  supportEmail: string;
  timezone: string;
  maintenanceMode: boolean;
  emergencyAlerts: boolean;
  supportNotifications: boolean;
}
