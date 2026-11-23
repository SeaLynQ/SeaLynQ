
import { db } from "../config/firebase";

export type BoatStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface BoatInput {
    boatName: string;
    registrationNumber: string;
    ownerName: string;
    contactNumber: string;
    boatType: string;
    capacity: number;
    status?: BoatStatus;
}

export interface Boat extends BoatInput {
    id: string;
    status: BoatStatus;
    createdAt?: FirebaseFirestore.Timestamp | Date;
    updatedAt?: FirebaseFirestore.Timestamp | Date;
}

const BOATS = "boats";
const AUDIT_LOGS = "audit_logs";

const normalizeRegistration = (value: string) =>
    value.trim().toUpperCase();

const validateBoat = (input: BoatInput): void => {
    if (
        !input.boatName?.trim() ||
        !input.registrationNumber?.trim() ||
        !input.ownerName?.trim() ||
        !input.contactNumber?.trim() ||
        !input.boatType?.trim()
    ) {
        throw new Error("All required boat fields must be provided.");
    }

    if (
        !Number.isInteger(input.capacity) ||
        input.capacity < 1
    ) {
        throw new Error("Capacity must be a positive whole number.");
    }

    if (
        input.status &&
        !["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(input.status)
    ) {
        throw new Error("Invalid boat status.");
    }
};

const toBoat = (
    id: string,
    data: FirebaseFirestore.DocumentData
): Boat => ({
    id,
    boatName: data.boatName,
    registrationNumber: data.registrationNumber,
    ownerName: data.ownerName,
    contactNumber: data.contactNumber,
    boatType: data.boatType,
    capacity: data.capacity,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
});

export const getAllBoats = async (): Promise<Boat[]> => {
    const snapshot = await db
        .collection(BOATS)
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map(doc => toBoat(doc.id, doc.data()));
};

export const getBoatById = async (
    id: string
): Promise<Boat | null> => {
    const doc = await db.collection(BOATS).doc(id).get();

    if (!doc.exists) return null;

    return toBoat(doc.id, doc.data()!);
};

export const createBoat = async (
    input: BoatInput,
    adminUid: string,
    adminEmail?: string
): Promise<Boat> => {
    validateBoat(input);

    const registrationNumber = normalizeRegistration(
        input.registrationNumber
    );

    const duplicate = await db
        .collection(BOATS)
        .where("registrationNumber", "==", registrationNumber)
        .limit(1)
        .get();

    if (!duplicate.empty) {
        throw new Error("A boat with this registration number already exists.");
    }

    const boatRef = db.collection(BOATS).doc();
    const auditRef = db.collection(AUDIT_LOGS).doc();
    const now = new Date();

    const boatData = {
        boatName: input.boatName.trim(),
        registrationNumber,
        ownerName: input.ownerName.trim(),
        contactNumber: input.contactNumber.trim(),
        boatType: input.boatType.trim(),
        capacity: input.capacity,
        status: input.status ?? "ACTIVE",
        createdAt: now,
        updatedAt: now
    };

    await db.runTransaction(async transaction => {
        transaction.create(boatRef, boatData);

        transaction.create(auditRef, {
            adminUid,
            adminEmail: adminEmail ?? null,
            action: "CREATE",
            resource: "BOATS",
            resourceId: boatRef.id,
            details: `Registered boat ${registrationNumber}`,
            timestamp: now
        });
    });

    return toBoat(boatRef.id, boatData);
};

export const updateBoat = async (
    id: string,
    input: BoatInput,
    adminUid: string,
    adminEmail?: string
): Promise<Boat> => {
    validateBoat(input);

    const boatRef = db.collection(BOATS).doc(id);
    const auditRef = db.collection(AUDIT_LOGS).doc();
    const registrationNumber = normalizeRegistration(
        input.registrationNumber
    );

    const updatedBoat = await db.runTransaction(async transaction => {
        const currentDoc = await transaction.get(boatRef);

        if (!currentDoc.exists) {
            throw new Error("Boat not found.");
        }

        const duplicateQuery = db.collection(BOATS)
            .where("registrationNumber", "==", registrationNumber)
            .limit(2);

        const duplicateSnapshot = await transaction.get(duplicateQuery);

        const duplicateExists = duplicateSnapshot.docs.some(
            doc => doc.id !== id
        );

        if (duplicateExists) {
            throw new Error(
                "Another boat already uses this registration number."
            );
        }

        const currentData = currentDoc.data()!;
        const now = new Date();

        const updatedData = {
            boatName: input.boatName.trim(),
            registrationNumber,
            ownerName: input.ownerName.trim(),
            contactNumber: input.contactNumber.trim(),
            boatType: input.boatType.trim(),
            capacity: input.capacity,
            status: input.status ?? currentData.status,
            updatedAt: now
        };

        transaction.update(boatRef, updatedData);

        transaction.create(auditRef, {
            adminUid,
            adminEmail: adminEmail ?? null,
            action: "UPDATE",
            resource: "BOATS",
            resourceId: id,
            details: `Updated boat ${registrationNumber}`,
            timestamp: now
        });

        return {
            ...currentData,
            ...updatedData,
            id,
            createdAt: currentData.createdAt
        } as Boat;
    });

    return updatedBoat;
};

export const deleteBoat = async (
    id: string,
    adminUid: string,
    adminEmail?: string
): Promise<void> => {
    const boatRef = db.collection(BOATS).doc(id);
    const auditRef = db.collection(AUDIT_LOGS).doc();

    await db.runTransaction(async transaction => {
        const boatDoc = await transaction.get(boatRef);

        if (!boatDoc.exists) {
            throw new Error("Boat not found.");
        }

        const boat = boatDoc.data()!;
        const now = new Date();

        transaction.delete(boatRef);

        transaction.create(auditRef, {
            adminUid,
            adminEmail: adminEmail ?? null,
            action: "DELETE",
            resource: "BOATS",
            resourceId: id,
            details: `Deleted boat ${boat.registrationNumber}`,
            timestamp: now
        });
    });
};
