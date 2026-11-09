import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaSignInAlt, FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import FormInput from "./ui/FormInput";
import "../pages/RegistrationForm.css";

/**
 * Sign in. Shares its card, fields and buttons with Register and Forgot
 * Password, so the three read as one flow.
 */
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");
    try {
      const result = await login(username, password);

      if (result && result.success) {
        // Redirect based on user type
        navigate(result.isAdmin ? "/admin" : "/profile");
      } else {
        setError(result?.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Connection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="ui-auth-container">
      <Card className="ui-auth-card">
        <Card.Header>
          <h2 className="ui-auth-title">
            <FaSignInAlt className="ui-auth-icon" /> Sign In
          </h2>
        </Card.Header>

        <Card.Body>
          {error && (
            <div className="ui-message ui-message-error" role="alert">
              <FaExclamationTriangle className="ui-message-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ui-auth-form">
            <FormInput
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
              disabled={isProcessing}
            />

            <FormInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isProcessing}
            />

            <div className="ui-form-actions">
              <Button type="submit" variant="primary" disabled={isProcessing} icon={<FaSignInAlt />}>
                {isProcessing ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>

          <div className="ui-auth-redirect">
            Don't have an account? <Link to="/register" className="ui-auth-link">Register here</Link>
          </div>
          <div className="ui-auth-redirect">
            <Link to="/forgot-password" className="ui-auth-link">Forgot your password?</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
