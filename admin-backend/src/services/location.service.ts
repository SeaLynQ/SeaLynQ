
import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";

const BOATS = "boats";
const LOCATIONS = "boat_locations";

export interface BoatLocation {
    boatId: string;
    boatName: string;
    registrationNumber: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    recordedAt: FirebaseFirestore.Timestamp | Date;
    sourceDeviceId: string | null;
}

export const getAllBoatLocations = async (): Promise<BoatLocation[]> => {
    const boatsSnapshot = await db.collection(BOATS).get();

    const results = await Promise.all(
        boatsSnapshot.docs.map(async (boatDoc) => {
            const boat = boatDoc.data();

            // Always read the same location document used by the simulator
            const locationDoc = await boatDoc.ref
                .collection(LOCATIONS)
                .doc(boatDoc.id)
                .get();

            if (!locationDoc.exists) {
                return null;
            }

            const data = locationDoc.data();

            const latitude = data?.latitude;
            const longitude = data?.longitude;

            if (
                typeof latitude !== "number" ||
                typeof longitude !== "number" ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {
                return null;
            }

            return {
                boatId: boatDoc.id,
                boatName: boat.boatName,
                registrationNumber: boat.registrationNumber,
                latitude,
                longitude,
                speed: typeof data?.speed === "number" ? data.speed : null,
                heading: typeof data?.heading === "number" ? data.heading : null,
                recordedAt: data?.recordedAt,
                sourceDeviceId: data?.sourceDeviceId ?? null
            } as BoatLocation;
        })
    );

    return results.filter(
        (location): location is BoatLocation => location !== null
    );
};

export const updateBoatLocation = async (
    boatId: string,
    latitude: number,
    longitude: number
): Promise<void> => {
    const boatRef = db.collection(BOATS).doc(boatId);
    const boatSnapshot = await boatRef.get();

    if (!boatSnapshot.exists) {
        throw new Error("Boat not found");
    }

    const locationRef = boatRef
        .collection(LOCATIONS)
        .doc(boatId);

    await locationRef.set(
        {
            boatId,
            latitude,
            longitude,
            speed: 0,
            heading: 0,
            recordedAt: Timestamp.now(),
            sourceDeviceId: "ADMIN-MANUAL-UPDATE",
            isSimulated: true
        },
        { merge: true }
    );
};
