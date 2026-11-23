
import { db } from "../config/firebase";

export type GatewayStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface GatewayInput {
    gatewayName: string;
    gatewayId: string;
    boatId: string;
    location?: string;
    status?: GatewayStatus;
}

export interface Gateway extends GatewayInput {
    id: string;
    status: GatewayStatus;
    createdAt?: FirebaseFirestore.Timestamp | Date;
    updatedAt?: FirebaseFirestore.Timestamp | Date;
}

const gatewaysCollection = db.collection("gateways");

function validateGateway(input: GatewayInput) {
    if (
        !input.gatewayName?.trim() ||
        !input.gatewayId?.trim() ||
        !input.boatId?.trim()
    ) {
        throw new Error("All required gateway fields must be provided");
    }

    if (
        input.status &&
        !["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(input.status)
    ) {
        throw new Error("Invalid gateway status");
    }
}

function toGateway(
    id: string,
    data: FirebaseFirestore.DocumentData
): Gateway {
    return {
        id,
        gatewayName: data.gatewayName,
        gatewayId: data.gatewayId,
        boatId: data.boatId,
        location: data.location,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
    };
}

export async function getAllGateways(): Promise<Gateway[]> {
    const snapshot = await gatewaysCollection
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map(doc => toGateway(doc.id, doc.data()));
}

export async function getGatewayById(id: string): Promise<Gateway | null> {
    const doc = await gatewaysCollection.doc(id).get();

    if (!doc.exists) return null;

    return toGateway(doc.id, doc.data()!);
}

export async function createGateway(input: GatewayInput): Promise<Gateway> {
    validateGateway(input);

    const boatDoc = await db.collection("boats").doc(input.boatId).get();

    if (!boatDoc.exists) {
        throw new Error("BOAT_NOT_FOUND");
    }

    const duplicate = await gatewaysCollection
        .where("gatewayId", "==", input.gatewayId.trim())
        .limit(1)
        .get();

    if (!duplicate.empty) {
        throw new Error("DUPLICATE_GATEWAY_ID");
    }

    const now = new Date();

    const gatewayData = {
        gatewayName: input.gatewayName.trim(),
        gatewayId: input.gatewayId.trim(),
        boatId: input.boatId,
        location: input.location?.trim() || "",
        status: input.status || "ACTIVE",
        createdAt: now,
        updatedAt: now
    };

    const docRef = await gatewaysCollection.add(gatewayData);

    await db.collection("audit_logs").add({
        action: "CREATE",
        resource: "GATEWAYS",
        resourceId: docRef.id,
        details: `Registered gateway ${gatewayData.gatewayName}`,
        timestamp: now
    });

    return toGateway(docRef.id, gatewayData);
}

export async function updateGateway(
    id: string,
    input: GatewayInput
): Promise<Gateway> {
    validateGateway(input);

    const gatewayRef = gatewaysCollection.doc(id);
    const existing = await gatewayRef.get();

    if (!existing.exists) {
        throw new Error("GATEWAY_NOT_FOUND");
    }

    const boatDoc = await db.collection("boats").doc(input.boatId).get();

    if (!boatDoc.exists) {
        throw new Error("BOAT_NOT_FOUND");
    }

    const duplicate = await gatewaysCollection
        .where("gatewayId", "==", input.gatewayId.trim())
        .limit(1)
        .get();

    if (!duplicate.empty && duplicate.docs[0].id !== id) {
        throw new Error("DUPLICATE_GATEWAY_ID");
    }

    const now = new Date();

    const updatedData = {
        gatewayName: input.gatewayName.trim(),
        gatewayId: input.gatewayId.trim(),
        boatId: input.boatId,
        location: input.location?.trim() || "",
        status: input.status || "ACTIVE",
        updatedAt: now
    };

    await gatewayRef.update(updatedData);

    await db.collection("audit_logs").add({
        action: "UPDATE",
        resource: "GATEWAYS",
        resourceId: id,
        details: `Updated gateway ${updatedData.gatewayName}`,
        timestamp: now
    });

    return toGateway(id, {
        ...existing.data(),
        ...updatedData
    });
}

export async function deleteGateway(id: string): Promise<void> {
    const gatewayRef = gatewaysCollection.doc(id);
    const existing = await gatewayRef.get();

    if (!existing.exists) {
        throw new Error("GATEWAY_NOT_FOUND");
    }

    const gateway = existing.data()!;
    const now = new Date();

    await gatewayRef.delete();

    await db.collection("audit_logs").add({
        action: "DELETE",
        resource: "GATEWAYS",
        resourceId: id,
        details: `Deleted gateway ${gateway.gatewayName}`,
        timestamp: now
    });
}
