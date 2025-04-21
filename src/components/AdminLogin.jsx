import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(username, password);

      if (result && result.success) {
        // Redirect based on user type
        if (result.isAdmin) {
          navigate("/admin");
        } else {
          navigate("/profile");
        }
      } else {
        setError(result.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Connection failed");
    }
  };

  return (
    <div className="login-container">
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="login-button">
          Sign In
        </button>

        <div className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>

        <div className="forgot-password">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>
      </form>
    </div>
  );
}
