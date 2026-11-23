
import { db } from "../config/firebase";
import { createAuditLog } from "./audit.service";

export interface MeshConnectionInput {
  boatId: string;
  gatewayId: string;
  deviceId: string;
}

export interface AdminInfo {
  uid: string;
  email?: string;
}

const connectionsCollection = db.collection("mesh_connections");

// Get all mesh connections with boat, gateway and device details
export const getAllMeshConnections = async () => {
  const snapshot = await connectionsCollection.get();

  const results = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const connection = doc.data();

      const [boatDoc, gatewayDoc, deviceDoc] = await Promise.all([
        db.collection("boats").doc(connection.boatId).get(),
        db.collection("gateways").doc(connection.gatewayId).get(),
        db.collection("devices").doc(connection.deviceId).get()
      ]);

      return {
        id: doc.id,
        ...connection,
        boatName: boatDoc.exists
          ? boatDoc.data()?.boatName ?? "Unknown Boat"
          : "Unknown Boat",
        gatewayName: gatewayDoc.exists
          ? gatewayDoc.data()?.gatewayName ?? "Unknown Gateway"
          : "Unknown Gateway",
        gatewayCode: gatewayDoc.exists
          ? gatewayDoc.data()?.gatewayId ?? ""
          : "",
        deviceName: deviceDoc.exists
          ? deviceDoc.data()?.deviceName ?? "Unknown Device"
          : "Unknown Device",
        serialNumber: deviceDoc.exists
          ? deviceDoc.data()?.serialNumber ?? ""
          : ""
      };
    })
  );

  return results;
};

// Get one connection
export const getMeshConnectionById = async (id: string) => {
  const doc = await connectionsCollection.doc(id).get();

  if (!doc.exists) {
    throw new Error("Mesh connection not found");
  }

  return {
    id: doc.id,
    ...doc.data()
  };
};

// Validate boat, gateway and device relationship
const validateConnection = async (input: MeshConnectionInput) => {
  if (!input.boatId || !input.gatewayId || !input.deviceId) {
    throw new Error("Boat, gateway and device are required");
  }

  const [boatDoc, gatewayDoc, deviceDoc] = await Promise.all([
    db.collection("boats").doc(input.boatId).get(),
    db.collection("gateways").doc(input.gatewayId).get(),
    db.collection("devices").doc(input.deviceId).get()
  ]);

  if (!boatDoc.exists) {
    throw new Error("Selected boat does not exist");
  }

  if (!gatewayDoc.exists) {
    throw new Error("Selected gateway does not exist");
  }

  if (!deviceDoc.exists) {
    throw new Error("Selected device does not exist");
  }

  if (gatewayDoc.data()?.boatId !== input.boatId) {
    throw new Error("Selected gateway does not belong to this boat");
  }

  if (deviceDoc.data()?.boatId !== input.boatId) {
    throw new Error("Selected device does not belong to this boat");
  }
if (gatewayDoc.data()?.status !== "ACTIVE") {
  throw new Error("Cannot connect an inactive gateway");
}

if (deviceDoc.data()?.status !== "ACTIVE") {
  throw new Error("Cannot connect an inactive device");
}
};

// Create connection


export const createMeshConnection = async (
  input: MeshConnectionInput,
  admin: AdminInfo
) => {
  await validateConnection(input);

  const docRef = connectionsCollection.doc(
    `${input.gatewayId}_${input.deviceId}`
  );

  await db.runTransaction(async (transaction) => {
    const duplicateQuery = connectionsCollection
      .where("gatewayId", "==", input.gatewayId)
      .where("deviceId", "==", input.deviceId);

    const [duplicateSnapshot, deterministicDoc] = await Promise.all([
      transaction.get(duplicateQuery),
      transaction.get(docRef)
    ]);

    if (!duplicateSnapshot.empty || deterministicDoc.exists) {
      throw new Error(
        "This device is already connected to this gateway"
      );
    }

    const now = new Date();

    transaction.create(docRef, {
      boatId: input.boatId,
      gatewayId: input.gatewayId,
      deviceId: input.deviceId,
      status: "CONFIGURED",
      createdAt: now,
      updatedAt: now,
      createdBy: admin.uid
    });
  });

  await createAuditLog({
    adminUid: admin.uid,
    adminEmail: admin.email,
    action: "CREATE",
    resource: "MESH_CONNECTION",
    resourceId: docRef.id,
    details: `Created mesh connection between gateway ${input.gatewayId} and device ${input.deviceId}`
  });

  return {
    id: docRef.id,
    boatId: input.boatId,
    gatewayId: input.gatewayId,
    deviceId: input.deviceId,
    status: "CONFIGURED"
  };
};



// Update connection

export const updateMeshConnection = async (
  id: string,
  input: MeshConnectionInput,
  admin: AdminInfo
) => {
  await validateConnection(input);

  const docRef = connectionsCollection.doc(id);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(docRef);

    if (!existing.exists) {
      throw new Error("Mesh connection not found");
    }

    const duplicateQuery = connectionsCollection
      .where("gatewayId", "==", input.gatewayId)
      .where("deviceId", "==", input.deviceId);

    const duplicateSnapshot = await transaction.get(duplicateQuery);

    const alreadyExists = duplicateSnapshot.docs.some(
      (doc) => doc.id !== id
    );

    if (alreadyExists) {
      throw new Error(
        "This device is already connected to this gateway"
      );
    }

    transaction.update(docRef, {
      boatId: input.boatId,
      gatewayId: input.gatewayId,
      deviceId: input.deviceId,
      updatedAt: new Date()
    });
  });

  await createAuditLog({
    adminUid: admin.uid,
    adminEmail: admin.email,
    action: "UPDATE",
    resource: "MESH_CONNECTION",
    resourceId: id,
    details: `Updated mesh connection ${id}`
  });

  return getMeshConnectionById(id);
};


// Delete connection
export const deleteMeshConnection = async (
  id: string,
  admin: AdminInfo
) => {
  const docRef = connectionsCollection.doc(id);
  const existing = await docRef.get();

  if (!existing.exists) {
    throw new Error("Mesh connection not found");
  }

  await docRef.delete();

  await createAuditLog({
    adminUid: admin.uid,
    adminEmail: admin.email,
    action: "DELETE",
    resource: "MESH_CONNECTION",
    resourceId: id,
    details: `Deleted mesh connection ${id}`
  });

  return { message: "Mesh connection deleted successfully" };
};
