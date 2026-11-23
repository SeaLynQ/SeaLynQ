import { db } from "../config/firebase";

export type DeviceStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface DeviceInput {
    deviceName: string;
    serialNumber: string;
    deviceType: string;
    boatId: string;
    status?: DeviceStatus;
}

export interface Device extends DeviceInput {
    id: string;
    status: DeviceStatus;
    createdAt?: FirebaseFirestore.Timestamp | Date;
    updatedAt?: FirebaseFirestore.Timestamp | Date;
}

const devicesCollection = db.collection("devices");

function validateDevice(input: DeviceInput) {
    if (
        !input.deviceName?.trim() ||
        !input.serialNumber?.trim() ||
        !input.deviceType?.trim() ||
        !input.boatId?.trim()
    ) {
        throw new Error("All required device fields must be provided");
    }

    if (
        input.status &&
        !["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(input.status)
    ) {
        throw new Error("Invalid device status");
    }
}

function toDevice(
    id: string,
    data: FirebaseFirestore.DocumentData
): Device {
    return {
        id,
        deviceName: data.deviceName,
        serialNumber: data.serialNumber,
        deviceType: data.deviceType,
        boatId: data.boatId,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
    };
}

export async function getAllDevices(): Promise<Device[]> {
    const snapshot = await devicesCollection.orderBy("createdAt", "desc").get();

    return snapshot.docs.map(doc => toDevice(doc.id, doc.data()));
}

export async function getDeviceById(id: string): Promise<Device | null> {
    const doc = await devicesCollection.doc(id).get();

    if (!doc.exists) return null;

    return toDevice(doc.id, doc.data()!);
}

export async function createDevice(input: DeviceInput): Promise<Device> {
    validateDevice(input);

    // Verify that the associated boat exists.
    const boatDoc = await db.collection("boats").doc(input.boatId).get();

    if (!boatDoc.exists) {
        throw new Error("BOAT_NOT_FOUND");
    }

    const duplicate = await devicesCollection
        .where("serialNumber", "==", input.serialNumber.trim())
        .limit(1)
        .get();

    if (!duplicate.empty) {
        throw new Error("DUPLICATE_SERIAL_NUMBER");
    }

    const now = new Date();

    const deviceData = {
        deviceName: input.deviceName.trim(),
        serialNumber: input.serialNumber.trim(),
        deviceType: input.deviceType.trim(),
        boatId: input.boatId,
        status: input.status || "ACTIVE",
        createdAt: now,
        updatedAt: now
    };

    const docRef = await devicesCollection.add(deviceData);

    await db.collection("audit_logs").add({
        action: "CREATE",
        resource: "DEVICES",
        resourceId: docRef.id,
        details: `Registered device ${deviceData.deviceName}`,
        timestamp: now
    });

    return toDevice(docRef.id, deviceData);
}

export async function updateDevice(
    id: string,
    input: DeviceInput
): Promise<Device> {
    validateDevice(input);

    const deviceRef = devicesCollection.doc(id);
    const existing = await deviceRef.get();

    if (!existing.exists) {
        throw new Error("DEVICE_NOT_FOUND");
    }

    const boatDoc = await db.collection("boats").doc(input.boatId).get();

    if (!boatDoc.exists) {
        throw new Error("BOAT_NOT_FOUND");
    }

    const duplicate = await devicesCollection
        .where("serialNumber", "==", input.serialNumber.trim())
        .limit(1)
        .get();

    if (!duplicate.empty && duplicate.docs[0].id !== id) {
        throw new Error("DUPLICATE_SERIAL_NUMBER");
    }

    const now = new Date();

    const updatedData = {
        deviceName: input.deviceName.trim(),
        serialNumber: input.serialNumber.trim(),
        deviceType: input.deviceType.trim(),
        boatId: input.boatId,
        status: input.status || "ACTIVE",
        updatedAt: now
    };

    await deviceRef.update(updatedData);

    await db.collection("audit_logs").add({
        action: "UPDATE",
        resource: "DEVICES",
        resourceId: id,
        details: `Updated device ${updatedData.deviceName}`,
        timestamp: now
    });

    return toDevice(id, {
        ...existing.data(),
        ...updatedData
    });
}

export async function deleteDevice(id: string): Promise<void> {
    const deviceRef = devicesCollection.doc(id);
    const existing = await deviceRef.get();

    if (!existing.exists) {
        throw new Error("DEVICE_NOT_FOUND");
    }

    const device = existing.data()!;
    const now = new Date();

    await deviceRef.delete();

    await db.collection("audit_logs").add({
        action: "DELETE",
        resource: "DEVICES",
        resourceId: id,
        details: `Deleted device ${device.deviceName}`,
        timestamp: now
    });
}