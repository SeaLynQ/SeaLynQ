
import { db } from "../config/firebase";

const USERS_COLLECTION = "users";

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

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [snapshot, boats, devices, emergencies, tickets] = await Promise.all([
    db.collection(USERS_COLLECTION).get(),
    db.collection("boats").get(),
    db.collection("devices").get(),
    db.collection("emergencies").get(),
    db.collection("support_tickets").get()
  ]);

  let activeUsers = 0;
  let inactiveUsers = 0;
  let adminCount = 0;
  let staffCount = 0;
  let openEmergencies = 0;
  let openSupportTickets = 0;

  snapshot.forEach((doc) => {
    const user = doc.data();

    if (user.status === "ACTIVE") {
      activeUsers++;
    } else {
      inactiveUsers++;
    }

    if (user.role === "ADMIN") {
      adminCount++;
    }
    if (user.role === "STAFF") staffCount++;
  });
  emergencies.forEach(doc => { if (!["RESOLVED", "CLOSED"].includes(String(doc.data().status).toUpperCase())) openEmergencies++; });
  tickets.forEach(doc => { if (!["RESOLVED", "CLOSED"].includes(String(doc.data().status).toUpperCase())) openSupportTickets++; });

  return {
    totalUsers: snapshot.size,
    activeUsers,
    inactiveUsers,
    adminCount,
    staffCount,
    totalBoats: boats.size,
    totalDevices: devices.size,
    openEmergencies,
    openSupportTickets
  };
};
