
import { db } from "../config/firebase";

export interface AuditLogInput {
  adminUid: string;
  adminEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

export const createAuditLog = async (
  log: AuditLogInput
): Promise<void> => {
  await db.collection("audit_logs").add({
    adminUid: log.adminUid,
    adminEmail: log.adminEmail ?? null,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId ?? null,
    details: log.details ?? null,
    timestamp: new Date()
  });
};

export const getAllAuditLogs = async () => {
  const snapshot = await db
    .collection("audit_logs")
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
};

