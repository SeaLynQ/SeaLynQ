import dotenv from "dotenv";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is missing from .env");
}

const firebaseApp = initializeApp({
    credential: applicationDefault(),
    projectId
});

export const db = getFirestore(firebaseApp);

console.log("Firebase Admin SDK initialized successfully");
