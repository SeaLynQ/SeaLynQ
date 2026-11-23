
import { db } from "../config/firebase";
import { getAuth } from "firebase-admin/auth";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF" | "STUDENT";
    status: UserStatus;
    createdAt?: FirebaseFirestore.Timestamp;
}

const USERS_COLLECTION = "users";
const AUDIT_COLLECTION = "audit_logs";

// Fetch one user
export const getUserById = async (
    uid: string
): Promise<UserProfile | null> => {
    const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();

    if (!userDoc.exists) return null;

    const firestoreData = userDoc.data() || {};

    return {
        uid: userDoc.id,
        name: firestoreData.name || "",
        email: firestoreData.email || "",
        role: firestoreData.role,
        status: firestoreData.status,
        createdAt: firestoreData.createdAt
    } as UserProfile;
};

// Fetch all users
export const getAllUsers = async (): Promise<UserProfile[]> => {
    const snapshot = await db.collection(USERS_COLLECTION).get();

    return Promise.all(
        snapshot.docs.map(async (doc) => {
            const firestoreData = doc.data();
            let email = firestoreData.email || "";

            if (!email) {
                try {
                    const authUser = await getAuth().getUser(doc.id);
                    email = authUser.email || "";
                } catch (error) {
                    console.error(
                        `Unable to retrieve email for user ${doc.id}:`,
                        error
                    );
                }
            }

            return {
                uid: doc.id,
                name: firestoreData.name || "",
                email,
                role: firestoreData.role,
                status: firestoreData.status,
                createdAt: firestoreData.createdAt
            } as UserProfile;
        })
    );
};

// Update user status and create audit log
export const updateUserStatus = async (
    uid: string,
    newStatus: UserStatus,
    adminUid: string,
    adminEmail?: string
): Promise<UserProfile> => {

    const userRef = db.collection(USERS_COLLECTION).doc(uid);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new Error("User not found.");
    }

    const existingData = userDoc.data()!;

    const previousStatus = existingData.status as UserStatus;

    if (previousStatus === newStatus) {
        throw new Error("User already has this account status.");
    }

    const auth = getAuth();

    // Verify Firebase Authentication account exists
    const authUser = await auth.getUser(uid);

    const previousDisabledState = authUser.disabled;
    const shouldDisable = newStatus !== "ACTIVE";

    // Create a unique audit document reference
    const auditRef = db.collection(AUDIT_COLLECTION).doc();

    try {
        // Synchronize Firebase Authentication
        await auth.updateUser(uid, {
            disabled: shouldDisable
        });

        // Update Firestore status and audit log atomically
        await db.runTransaction(async (transaction) => {

            const currentDoc = await transaction.get(userRef);

            if (!currentDoc.exists) {
                throw new Error("User not found.");
            }

            const currentData = currentDoc.data()!;

            if (currentData.status !== previousStatus) {
                throw new Error(
                    "User status changed during this operation. Please retry."
                );
            }

            transaction.update(userRef, {
                status: newStatus,
                updatedAt: new Date()
            });

            transaction.set(auditRef, {
                adminUid,
                adminEmail: adminEmail ?? null,
                action: "UPDATE",
                resource: "USERS",
                resourceId: uid,
                details: `Changed account status from ${previousStatus} to ${newStatus}`,
                timestamp: new Date()
            });
        });

        // Return the updated profile without another database read
        return {
            uid,
            name: existingData.name || "",
            email: existingData.email || authUser.email || "",
            role: existingData.role,
            status: newStatus,
            createdAt: existingData.createdAt
        } as UserProfile;

    } catch (error) {

        // Restore the previous Firebase Authentication state
        try {
            await auth.updateUser(uid, {
                disabled: previousDisabledState
            });
        } catch (rollbackError) {
            console.error(
                "CRITICAL: Firebase Authentication rollback failed:",
                rollbackError
            );
        }

        throw error;
    }
};
