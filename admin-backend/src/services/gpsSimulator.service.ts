
import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";

const BOATS_COLLECTION = "boats";
const LOCATIONS_COLLECTION = "boat_locations";

let simulatorInterval: NodeJS.Timeout | null = null;
let movementStep = 0;

// Store each boat's original coordinates independently
const boatOrigins = new Map<
    string,
    { latitude: number; longitude: number }
>();

const updateBoatLocations = async (): Promise<void> => {
    try {
        const boatsSnapshot = await db
            .collection(BOATS_COLLECTION)
            .where("status", "==", "ACTIVE")
            .get();

        if (boatsSnapshot.empty) {
            console.log("GPS Simulator: No active boats found.");
            return;
        }

        const batch = db.batch();
        let updatedCount = 0;

        for (const boatDoc of boatsSnapshot.docs) {
            const locationRef = boatDoc.ref
                .collection(LOCATIONS_COLLECTION)
                .doc(boatDoc.id);

            const locationSnapshot = await locationRef.get();

            // Never invent a starting location for a boat
            if (!locationSnapshot.exists) {
                console.log(
                    `GPS Simulator: No existing location for ${boatDoc.id}`
                );
                continue;
            }

            const data = locationSnapshot.data();

            if (
                typeof data?.latitude !== "number" ||
                typeof data?.longitude !== "number"
            ) {
                continue;
            }

            // Capture this boat's original location once
            if (!boatOrigins.has(boatDoc.id)) {
                boatOrigins.set(boatDoc.id, {
                    latitude: data.latitude,
                    longitude: data.longitude
                });
            }

            const origin = boatOrigins.get(boatDoc.id)!;

            // Generate circular movement around the origin
            const phase = movementStep / 10;

            // Approximately 100-metre circular movement
            const latitude =
                origin.latitude + Math.cos(phase) * 0.001;

            const longitude =
                origin.longitude + Math.sin(phase) * 0.001;

            const speed = Number(
                (8 + Math.random() * 7).toFixed(1)
            );

            const heading = Math.round(
                (phase * 180 / Math.PI + 90) % 360
            );

            batch.set(
                locationRef,
                {
                    boatId: boatDoc.id,
                    latitude,
                    longitude,
                    speed,
                    heading,
                    recordedAt: Timestamp.now(),
                    sourceDeviceId: "GPS-SIMULATOR",
                    isSimulated: true
                },
                { merge: true }
            );

            updatedCount++;
        }

        if (updatedCount > 0) {
            await batch.commit();
        }

        movementStep++;

        console.log(
            `GPS Simulator: Updated locations for ${updatedCount} boat(s).`
        );

    } catch (error) {
        console.error("GPS Simulator update failed:", error);
    }
};

// Start GPS simulator
export const startGpsSimulator = (): void => {
    if (simulatorInterval) {
        console.log("GPS Simulator is already running.");
        return;
    }

    movementStep = 0;
    boatOrigins.clear();

    console.log("GPS Simulator started.");

    void updateBoatLocations();

    simulatorInterval = setInterval(() => {
        void updateBoatLocations();
    }, 5000);
};

// Stop GPS simulator
export const stopGpsSimulator = (): void => {
    if (!simulatorInterval) {
        console.log("GPS Simulator is not running.");
        return;
    }

    clearInterval(simulatorInterval);
    simulatorInterval = null;

    boatOrigins.clear();
    movementStep = 0;

    console.log("GPS Simulator stopped.");
};

// Update a boat's movement origin after manual location change
export const updateGpsSimulatorOrigin = (
    boatId: string,
    latitude: number,
    longitude: number
): void => {
    boatOrigins.set(boatId, {
        latitude,
        longitude
    });

    console.log(
        `GPS Simulator: Updated origin for boat ${boatId}`
    );
};
