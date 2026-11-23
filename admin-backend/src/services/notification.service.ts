
import { db } from "../config/firebase";

export type NotificationType =
    | "EMERGENCY"
    | "BOAT"
    | "DEVICE"
    | "NETWORK"
    | "SYSTEM";

export type NotificationStatus = "READ" | "UNREAD";

export interface NotificationInput {
    title: string;
    message: string;
    type: NotificationType;
    relatedEntityId?: string;
    relatedEntityType?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    createdBy: string;
    createdAt: Date;
    readAt: Date | null;
}

const NOTIFICATIONS = "notifications";

const toDate = (value: any): Date => {
    if (value?.toDate) {
        return value.toDate();
    }

    return value instanceof Date ? value : new Date(value);
};

const toNotification = (
    id: string,
    data: FirebaseFirestore.DocumentData,
    status: NotificationStatus,
    readAt: Date | null
): Notification => ({
    id,
    title: data.title,
    message: data.message,
    type: data.type,
    status,
    relatedEntityId: data.relatedEntityId ?? null,
    relatedEntityType: data.relatedEntityType ?? null,
    createdBy: data.createdBy,
    createdAt: toDate(data.createdAt),
    readAt
});

const validateNotification = (input: NotificationInput): void => {
    const validTypes: NotificationType[] = [
        "EMERGENCY",
        "BOAT",
        "DEVICE",
        "NETWORK",
        "SYSTEM"
    ];

    if (!input.title?.trim()) {
        throw new Error("Notification title is required.");
    }

    if (input.title.trim().length > 150) {
        throw new Error("Notification title cannot exceed 150 characters.");
    }

    if (!input.message?.trim()) {
        throw new Error("Notification message is required.");
    }

    if (input.message.trim().length > 2000) {
        throw new Error("Notification message cannot exceed 2000 characters.");
    }

    if (!validTypes.includes(input.type)) {
        throw new Error("Invalid notification type.");
    }
};

// GET all notifications.
// Each administrator gets their own READ / UNREAD status.
export const getAllNotifications = async (
    adminUid: string
): Promise<Notification[]> => {
    const snapshot = await db
        .collection(NOTIFICATIONS)
        .orderBy("createdAt", "desc")
        .get();

    const notifications = await Promise.all(
        snapshot.docs.map(async doc => {
            const readDoc = await doc.ref
                .collection("readBy")
                .doc(adminUid)
                .get();

            const readData = readDoc.data();

            const status: NotificationStatus =
                readDoc.exists ? "READ" : "UNREAD";

            const readAt = readData?.readAt
                ? toDate(readData.readAt)
                : null;

            return toNotification(
                doc.id,
                doc.data(),
                status,
                readAt
            );
        })
    );

    return notifications;
};

// GET one notification.
export const getNotificationById = async (
    id: string,
    adminUid: string
): Promise<Notification | null> => {
    const notificationRef = db
        .collection(NOTIFICATIONS)
        .doc(id);

    const doc = await notificationRef.get();

    if (!doc.exists) {
        return null;
    }

    const readDoc = await notificationRef
        .collection("readBy")
        .doc(adminUid)
        .get();

    const readData = readDoc.data();

    return toNotification(
        doc.id,
        doc.data()!,
        readDoc.exists ? "READ" : "UNREAD",
        readData?.readAt ? toDate(readData.readAt) : null
    );
};

// CREATE a shared notification.
export const createNotification = async (
    input: NotificationInput,
    createdBy: string
): Promise<Notification> => {
    validateNotification(input);

    const now = new Date();

    const notificationData = {
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type,
        relatedEntityId: input.relatedEntityId ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        createdBy,
        createdAt: now
    };

    const notificationRef = await db
        .collection(NOTIFICATIONS)
        .add(notificationData);

    return toNotification(
        notificationRef.id,
        notificationData,
        "UNREAD",
        null
    );
};

// MARK one notification as read for the current administrator.
export const markNotificationAsRead = async (
    id: string,
    adminUid: string
): Promise<Notification> => {
    const notificationRef = db
        .collection(NOTIFICATIONS)
        .doc(id);

    const readRef = notificationRef
        .collection("readBy")
        .doc(adminUid);

    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
        throw new Error("Notification not found.");
    }

    const now = new Date();

    await readRef.set({
        userId: adminUid,
        readAt: now
    });

    return toNotification(
        notificationDoc.id,
        notificationDoc.data()!,
        "READ",
        now
    );
};

// MARK all notifications as read for the current administrator.
export const markAllNotificationsAsRead = async (
    adminUid: string
): Promise<number> => {
    const snapshot = await db
        .collection(NOTIFICATIONS)
        .get();

    if (snapshot.empty) {
        return 0;
    }

    let updatedCount = 0;

    // Firestore batches support a maximum of 500 writes.
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += 500) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + 500);
        const now = new Date();

        for (const doc of chunk) {
            const readRef = doc.ref
                .collection("readBy")
                .doc(adminUid);

            batch.set(readRef, {
                userId: adminUid,
                readAt: now
            });
        }

        await batch.commit();
        updatedCount += chunk.length;
    }

    return updatedCount;
};

// DELETE a shared notification.
// This removes it for every administrator.
export const deleteNotification = async (
    id: string
): Promise<void> => {
    const notificationRef = db
        .collection(NOTIFICATIONS)
        .doc(id);

    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
        throw new Error("Notification not found.");
    }

    const readSnapshot = await notificationRef
        .collection("readBy")
        .get();

    // Delete read-status documents before deleting the parent.
    const readDocs = readSnapshot.docs;

    for (let i = 0; i < readDocs.length; i += 500) {
        const batch = db.batch();

        readDocs.slice(i, i + 500).forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }

    await notificationRef.delete();
};
