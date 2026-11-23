
import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { auth } from "../config/firebase";

interface Boat {
    id: string;
    boatName: string;
    registrationNumber: string;
    status: string;
}

interface BoatLocation {
    boatId: string;
    boatName: string;
    registrationNumber: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    recordedAt: string | Date | { seconds: number };
    sourceDeviceId: string | null;
}

const boatIcon = L.divIcon({
    className: "boat-map-marker",
    html: `<div style="
        background:#0d9488;
        width:18px;
        height:18px;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px #0005;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

function LiveLocation() {
    const [boats, setBoats] = useState<Boat[]>([]);
    const [locations, setLocations] = useState<BoatLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [simulatorStatus, setSimulatorStatus] = useState<
        "Unknown" | "Running" | "Stopped"
    >("Unknown");
    const [simulatorLoading, setSimulatorLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Manual boat location management
    const [selectedBoatId, setSelectedBoatId] = useState("");
    const [placeQuery, setPlaceQuery] = useState("");
    const [searchingPlace, setSearchingPlace] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);
    const [placeResults, setPlaceResults] = useState<any[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [locationMessage, setLocationMessage] = useState("");
    const [locationError, setLocationError] = useState("");

    // Fetch boats and their latest locations
    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            try {
                const user = auth.currentUser;

                if (!user) {
                    throw new Error("Admin is not logged in");
                }

                const token = await user.getIdToken();

                const headers = {
                    Authorization: `Bearer ${token}`
                };

                const [boatsResponse, locationsResponse] =
                    await Promise.all([
                        fetch("http://localhost:5000/api/boats", {
                            headers
                        }),
                        fetch("http://localhost:5000/api/locations", {
                            headers
                        })
                    ]);

                const boatsResult = await boatsResponse.json();
                const locationsResult = await locationsResponse.json();

                if (!boatsResponse.ok) {
                    throw new Error(
                        boatsResult.message || "Failed to fetch boats"
                    );
                }

                if (!locationsResponse.ok) {
                    throw new Error(
                        locationsResult.message || "Failed to fetch locations"
                    );
                }

                if (active) {
                    setBoats(boatsResult.data || []);
                    setLocations(locationsResult.data || []);
                    setError("");
                }
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load location data"
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        // Refresh location data every 5 seconds
        const interval = setInterval(fetchData, 5000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [refreshKey]);

    // Start or stop GPS simulation
    const controlSimulator = async (action: "start" | "stop") => {
        try {
            setSimulatorLoading(true);
            setActionError("");

            const user = auth.currentUser;

            if (!user) {
                throw new Error("Admin is not logged in");
            }

            const token = await user.getIdToken();

            const response = await fetch(
                `http://localhost:5000/api/gps-simulator/${action}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Simulator action failed"
                );
            }

            setSimulatorStatus(
                action === "start" ? "Running" : "Stopped"
            );

            // Refresh location data immediately
            setRefreshKey(previous => previous + 1);

        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Failed to control GPS simulator"
            );
        } finally {
            setSimulatorLoading(false);
        }
    };


// Search for a place using OpenStreetMap Nominatim
const searchPlace = async () => {
    const query = placeQuery.trim();

    if (!query) {
        setLocationError("Enter a place name first.");
        return;
    }

    setSearchingPlace(true);
    setLocationError("");
    setLocationMessage("");
    setPlaceResults([]);
    setSelectedPlace(null);

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
            {
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error("Place search failed. Please try again.");
        }

        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
            setLocationError("No matching places found.");
            return;
        }

        setPlaceResults(results);
    } catch (err) {
        setLocationError(
            err instanceof Error
                ? err.message
                : "Unable to search for this place."
        );
    } finally {
        setSearchingPlace(false);
    }
};

// Save selected coordinates to the backend
const saveBoatLocation = async () => {
    if (!selectedBoatId) {
        setLocationError("Select a boat first.");
        return;
    }

    if (!selectedPlace) {
        setLocationError("Select a place from the search results.");
        return;
    }

    try {
        setSavingLocation(true);
        setLocationError("");
        setLocationMessage("");

        const user = auth.currentUser;

        if (!user) {
            throw new Error("Admin is not logged in.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
            "http://localhost:5000/api/locations",
            {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    boatId: selectedBoatId,
                    latitude: Number(selectedPlace.lat),
                    longitude: Number(selectedPlace.lon)
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to update boat location."
            );
        }

        setLocationMessage(
            "Boat location updated successfully."
        );

        setPlaceQuery("");
        setPlaceResults([]);
        setSelectedPlace(null);

        // Refresh the map with the updated coordinates
        setRefreshKey(previous => previous + 1);

    } catch (err) {
        setLocationError(
            err instanceof Error
                ? err.message
                : "Failed to update boat location."
        );
    } finally {
        setSavingLocation(false);
    }
};


    const locationMap = new Map(
        locations.map(location => [location.boatId, location])
    );

    const unavailableBoats = boats.filter(
        boat => !locationMap.has(boat.id)
    );

    if (loading) {
        return <div style={{ padding: 24 }}>Loading boat locations...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: 24, color: "red" }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>

            <h1>Live Boat Locations</h1>
            {/* Manual Boat Location Management */}
            <div
                style={{
                    background: "#ffffff",
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                    border: "1px solid #e5e7eb"
                }}
            >
                <h2>Manage Boat Location</h2>

                <p style={{ color: "#6b7280", marginBottom: "15px" }}>
                    Search for a place and assign its coordinates to a boat.
                </p>

                {/* Select Boat */}
                <div style={{ marginBottom: "15px" }}>
                    <label>Select Boat</label>

                    <select
                        value={selectedBoatId}
                        onChange={(e) => setSelectedBoatId(e.target.value)}
                        style={{
                            display: "block",
                            width: "100%",
                            padding: "10px",
                            marginTop: "6px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db"
                        }}
                    >
                        <option value="">Choose a boat</option>

                        {boats.map((boat) => (
                            <option key={boat.id} value={boat.id}>
                                {boat.boatName} ({boat.registrationNumber})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search Place */}
                <div style={{ marginBottom: "15px" }}>
                    <label>Search Location</label>

                    <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                        <input
                            type="text"
                            value={placeQuery}
                            onChange={(e) => setPlaceQuery(e.target.value)}
                            placeholder="Example: Veraval, Gujarat"
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db"
                            }}
                        />

                        <button
                            onClick={searchPlace}
                            disabled={searchingPlace}
                            style={{
                                padding: "10px 18px",
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer"
                            }}
                        >
                            {searchingPlace ? "Searching..." : "Search"}
                        </button>
                    </div>
                </div>

                {/* Search Results */}
                {placeResults.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                        <label>Search Results</label>

                        {placeResults.map((place, index) => (
                            <button
                                key={place.place_id ?? index}
                                onClick={() => setSelectedPlace(place)}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "12px",
                                    marginTop: "8px",
                                    borderRadius: "6px",
                                    border: selectedPlace === place
                                        ? "2px solid #2563eb"
                                        : "1px solid #d1d5db",
                                    background: selectedPlace === place
                                        ? "#eff6ff"
                                        : "#ffffff",
                                    cursor: "pointer"
                                }}
                            >
                                {place.display_name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected Place */}
                {selectedPlace && (
                    <div
                        style={{
                            background: "#f3f4f6",
                            padding: "12px",
                            borderRadius: "6px",
                            marginBottom: "15px"
                        }}
                    >
                        <strong>Selected Location</strong>

                        <p>{selectedPlace.display_name}</p>

                        <p>
                            Latitude: {selectedPlace.lat}
                            <br />
                            Longitude: {selectedPlace.lon}
                        </p>
                    </div>
                )}

                {/* Error and Success Messages */}
                {locationError && (
                    <p style={{ color: "#dc2626" }}>{locationError}</p>
                )}

                {locationMessage && (
                    <p style={{ color: "#16a34a" }}>{locationMessage}</p>
                )}

                {/* Save */}
                <button
                    onClick={saveBoatLocation}
                    disabled={savingLocation || !selectedBoatId || !selectedPlace}
                    style={{
                        padding: "11px 20px",
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        opacity: savingLocation || !selectedBoatId || !selectedPlace
                            ? 0.5
                            : 1
                    }}
                >
                    {savingLocation ? "Updating..." : "Update Boat Location"}
                </button>

                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px" }}>
                    Place search powered by OpenStreetMap Nominatim.
                </p>
            </div>

            {/* GPS Simulator Controls */}
            <div style={{
                padding: 20,
                marginBottom: 24,
                border: "1px solid #ccc",
                borderRadius: 12
            }}>

                <h2 style={{ marginTop: 0 }}>
                    GPS Simulator
                </h2>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16
                }}>
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background:
                                simulatorStatus === "Running"
                                    ? "#16a34a"
                                    : simulatorStatus === "Stopped"
                                        ? "#dc2626"
                                        : "#9ca3af"
                        }}
                    />

                    <strong>
                        Status: {simulatorStatus}
                    </strong>

                    <span style={{
                        fontSize: 12,
                        color: "#d97706",
                        background: "#fef3c7",
                        padding: "4px 8px",
                        borderRadius: 5
                    }}>
                        DEMO DATA
                    </span>
                </div>

                <div style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap"
                }}>

                    <button
                        onClick={() => controlSimulator("start")}
                        disabled={
                            simulatorLoading ||
                            simulatorStatus === "Running"
                        }
                        style={{
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: 8,
                            background: "#16a34a",
                            color: "white",
                            cursor: "pointer",
                            opacity:
                                simulatorLoading ||
                                simulatorStatus === "Running"
                                    ? 0.5
                                    : 1
                        }}
                    >
                        {simulatorLoading
                            ? "Please wait..."
                            : "▶ Start Simulation"}
                    </button>

                    <button
                        onClick={() => controlSimulator("stop")}
                        disabled={
                            simulatorLoading ||
                            simulatorStatus !== "Running"
                        }
                        style={{
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: 8,
                            background: "#dc2626",
                            color: "white",
                            cursor: "pointer",
                            opacity:
                                simulatorLoading ||
                                simulatorStatus !== "Running"
                                    ? 0.5
                                    : 1
                        }}
                    >
                        ■ Stop Simulation
                    </button>

                </div>

                {actionError && (
                    <p style={{ color: "#dc2626", marginBottom: 0 }}>
                        {actionError}
                    </p>
                )}

            </div>

            {/* Boat Statistics */}
            <div style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 20
            }}>
                <div>
                    Total Boats: <strong>{boats.length}</strong>
                </div>

                <div>
                    GPS Available: <strong>{locations.length}</strong>
                </div>

                <div>
                    GPS Unavailable: <strong>{unavailableBoats.length}</strong>
                </div>
            </div>

            {/* Map */}
            <div style={{
                height: 480,
                width: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #ccc"
            }}>
                <MapContainer
                    center={
                        locations.length > 0
                            ? [
                                locations[0].latitude,
                                locations[0].longitude
                            ]
                            : [12.8442, 74.8192]
                    }
                    zoom={11}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {locations.map(location => (
                        <Marker
                            key={location.boatId}
                            position={[
                                location.latitude,
                                location.longitude
                            ]}
                            icon={boatIcon}
                        >
                            <Popup>
                                <strong>{location.boatName}</strong>
                                <br />
                                Registration: {location.registrationNumber}
                                <br />
                                Speed: {location.speed ?? "N/A"} km/h
                                <br />
                                Heading: {location.heading ?? "N/A"}°
                                <br />
                                Source: {location.sourceDeviceId ?? "N/A"}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Boats Without GPS */}
            <h2 style={{ marginTop: 28 }}>
                Boats Without GPS Data
            </h2>

            {unavailableBoats.length === 0 ? (
                <p>All registered boats have location records.</p>
            ) : (
                unavailableBoats.map(boat => (
                    <div
                        key={boat.id}
                        style={{
                            padding: 14,
                            marginTop: 10,
                            border: "1px solid #ccc",
                            borderRadius: 8
                        }}
                    >
                        <strong>{boat.boatName}</strong>
                        <p>Registration: {boat.registrationNumber}</p>
                        <p>Status: {boat.status}</p>
                        <p style={{ color: "#d97706" }}>
                            Location unavailable
                        </p>
                    </div>
                ))
            )}

        </div>
    );
}

export default LiveLocation;
