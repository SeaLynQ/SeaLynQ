
import dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are missing");
}

const firebaseApp = initializeApp({
    credential: cert({
        projectId,
        clientEmail,
        privateKey
    }),
    projectId
});

export const db = getFirestore(firebaseApp);

console.log("Firebase Admin SDK initialized successfully");
