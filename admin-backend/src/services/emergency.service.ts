
import { db } from "../config/firebase";

export type EmergencyType =
    | "SOS"
    | "ENGINE_FAILURE"
    | "FIRE"
    | "MEDICAL"
    | "SINKING"
    | "MAN_OVERBOARD"
    | "OTHER";

export type EmergencySeverity =
    | "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW";

export type EmergencyStatus =
    | "NEW"
    | "ACKNOWLEDGED"
    | "RESPONDING"
    | "RESOLVED";

export interface EmergencyInput {
    boatId: string;
    type: EmergencyType;
    severity: EmergencySeverity;
    description: string;
    latitude?: number;
    longitude?: number;
    reportedAt?: string;
}

export interface Emergency extends Omit<EmergencyInput, "reportedAt"> {
    id: string;
    boatName: string;
    registrationNumber: string;
    status: EmergencyStatus;
    assignedTo?: string | null;
    resolutionNote?: string | null;
    reportedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EMERGENCIES = "emergencies";
const BOATS = "boats";
const AUDIT_LOGS = "audit_logs";
const NOTIFICATIONS = "notifications";

const toEmergency = (
    id: string,
    data: FirebaseFirestore.DocumentData
): Emergency => ({
    id,
    boatId: data.boatId,
    boatName: data.boatName,
    registrationNumber: data.registrationNumber,
    type: data.type,
    severity: data.severity,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    assignedTo: data.assignedTo ?? null,
    resolutionNote: data.resolutionNote ?? null,
    reportedAt: data.reportedAt?.toDate
        ? data.reportedAt.toDate()
        : new Date(data.reportedAt),
    createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt)
});

const validateEmergency = (input: EmergencyInput): void => {
    const validTypes = [
        "SOS",
        "ENGINE_FAILURE",
        "FIRE",
        "MEDICAL",
        "SINKING",
        "MAN_OVERBOARD",
        "OTHER"
    ];

    const validSeverities = [
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW"
    ];

    if (!input.boatId?.trim()) {
        throw new Error("A boat must be selected.");
    }

    if (!validTypes.includes(input.type)) {
        throw new Error("Invalid emergency type.");
    }

    if (!validSeverities.includes(input.severity)) {
        throw new Error("Invalid emergency severity.");
    }

    if (!input.description?.trim()) {
        throw new Error("Emergency description is required.");
    }

    if (input.description.trim().length > 2000) {
        throw new Error("Description cannot exceed 2000 characters.");
    }

    if (
        input.latitude !== undefined &&
        (!Number.isFinite(input.latitude) ||
            input.latitude < -90 ||
            input.latitude > 90)
    ) {
        throw new Error("Invalid latitude.");
    }

    if (
        input.longitude !== undefined &&
        (!Number.isFinite(input.longitude) ||
            input.longitude < -180 ||
            input.longitude > 180)
    ) {
        throw new Error("Invalid longitude.");
    }
};

export const getAllEmergencies = async (): Promise<Emergency[]> => {
    const snapshot = await db
        .collection(EMERGENCIES)
        .get();

    return snapshot.docs
        .map(doc => toEmergency(doc.id, doc.data()))
        .sort(
            (a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime()
        );
};

export const getEmergencyById = async (
    id: string
): Promise<Emergency | null> => {
    const doc = await db
        .collection(EMERGENCIES)
        .doc(id)
        .get();

    if (!doc.exists) return null;

    return toEmergency(doc.id, doc.data()!);
};

export const createEmergency = async (
    input: EmergencyInput,
    adminUid: string,
    adminEmail?: string
): Promise<Emergency> => {
    validateEmergency(input);

    const boatDoc = await db
        .collection(BOATS)
        .doc(input.boatId)
        .get();

    if (!boatDoc.exists) {
        throw new Error("Selected boat does not exist.");
    }

    const boat = boatDoc.data()!;
const emergencyRef = db.collection(EMERGENCIES).doc();
const auditRef = db.collection(AUDIT_LOGS).doc();
const notificationRef = db.collection(NOTIFICATIONS).doc();

    const now = new Date();

    const reportedAt = input.reportedAt
        ? new Date(input.reportedAt)
        : now;

    if (Number.isNaN(reportedAt.getTime())) {
        throw new Error("Invalid reported date.");
    }

    const emergencyData = {
        boatId: input.boatId,
        boatName: boat.boatName,
        registrationNumber: boat.registrationNumber,
        type: input.type,
        severity: input.severity,
        description: input.description.trim(),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        status: "NEW" as EmergencyStatus,
        assignedTo: null,
        resolutionNote: null,
        reportedAt,
        createdAt: now,
        updatedAt: now
    };

  await db.runTransaction(async transaction => {

      // 1. Create emergency
      transaction.create(emergencyRef, emergencyData);

      // 2. Create audit log
      transaction.create(auditRef, {
          adminUid,
          adminEmail: adminEmail ?? null,
          action: "CREATE",
          resource: "EMERGENCIES",
          resourceId: emergencyRef.id,
          details: `Reported ${input.type} emergency for ${boat.registrationNumber}`,
          timestamp: now
      });

      // 3. Create notification for all administrators
      transaction.create(notificationRef, {
          title: `New ${input.severity} Emergency`,
          message: `${input.type.replace(/_/g, " ")} reported for ${boat.boatName} (${boat.registrationNumber}). ${input.description.trim()}`,
          type: "EMERGENCY",
          relatedEntityId: emergencyRef.id,
          relatedEntityType: "EMERGENCY",
          createdBy: adminUid,
          createdAt: now
      });

  });
    return toEmergency(emergencyRef.id, emergencyData);
};

export const updateEmergencyStatus = async (
    id: string,
    status: EmergencyStatus,
    adminUid: string,
    adminEmail?: string,
    assignedTo?: string,
    resolutionNote?: string
): Promise<Emergency> => {
    const validStatuses = [
        "NEW",
        "ACKNOWLEDGED",
        "RESPONDING",
        "RESOLVED"
    ];

    if (!validStatuses.includes(status)) {
        throw new Error("Invalid emergency status.");
    }

    const emergencyRef = db
        .collection(EMERGENCIES)
        .doc(id);

    const auditRef = db.collection(AUDIT_LOGS).doc();

    const updatedEmergency = await db.runTransaction(
        async transaction => {
            const emergencyDoc = await transaction.get(emergencyRef);

            if (!emergencyDoc.exists) {
                throw new Error("Emergency not found.");
            }

            const currentData = emergencyDoc.data()!;
            const now = new Date();

            const updates: Record<string, unknown> = {
                status,
                updatedAt: now
            };

            if (assignedTo !== undefined) {
                updates.assignedTo = assignedTo.trim() || null;
            }

            if (resolutionNote !== undefined) {
                updates.resolutionNote = resolutionNote.trim() || null;
            }

            transaction.update(emergencyRef, updates);

            transaction.create(auditRef, {
                adminUid,
                adminEmail: adminEmail ?? null,
                action: "UPDATE",
                resource: "EMERGENCIES",
                resourceId: id,
                details: `Changed emergency status from ${currentData.status} to ${status}`,
                timestamp: now
            });

            return {
                ...currentData,
                ...updates
            };
        }
    );

    return toEmergency(id, updatedEmergency);
};
