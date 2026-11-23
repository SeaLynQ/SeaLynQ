
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../config/firebase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const token = await credential.user.getIdToken();

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
        throw new Error(result.message || "Access denied");
      }

      if (result.data?.role !== "ADMIN") {
        await auth.signOut();
        throw new Error("You do not have administrator access.");
      }

  const supportResponse = await fetch(
      "http://localhost:5000/api/support",
      {
          method: "GET",
          headers: {
              Authorization: `Bearer ${token}`
          }
      }
  );

  const supportResult = await supportResponse.json();

  console.log("Support API Status:", supportResponse.status);
  console.log("Support API Response:", supportResult);

      // Redirect authenticated administrators to the dashboard.
      navigate("/dashboard");

    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to sign in.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent. Check your inbox.");
    } catch {
      setError("Unable to send password reset email.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h1>SeaLynQ</h1>
          <p>ADMIN PORTAL</p>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your administration dashboard.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@sealynq.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <button
              type="button"
              className="forgot-button"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-success">{message}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          Secure SeaLynQ Administration Portal
        </div>
      </div>
    </div>
  );
}

export default Login;
