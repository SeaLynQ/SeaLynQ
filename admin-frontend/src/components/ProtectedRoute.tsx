
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        setChecking(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          "http://localhost:5000/api/auth/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const result = await response.json();

        if (!response.ok) {
          await signOut(auth);
          setAuthorized(false);
          return;
        }

        if (
          result.data?.role !== "ADMIN" ||
          result.data?.status !== "ACTIVE"
        ) {
          await signOut(auth);
          setAuthorized(false);
          return;
        }

        setAuthorized(true);

      } catch (error) {
        console.error("Authorization check failed:", error);
        await signOut(auth);
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (checking) {
    return <p>Verifying administrator access...</p>;
  }

  if (!authorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
