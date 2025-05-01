import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Corrected path
import Card from "../components/ui/Card"; // Corrected path
import Button from "../components/ui/Button"; // Corrected path
import FormInput from "../components/ui/FormInput"; // Corrected path
import { FaUserPlus, FaExclamationTriangle } from "react-icons/fa";
import "./RegistrationForm.css";

export default function RegistrationForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsProcessing(true);
  
    // Validate inputs
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsProcessing(false);
      return;
    }
  
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsProcessing(false);
      return;
    }
  
    try {
      console.log("Starting registration for:", username);
      const result = await register(username, password);
      console.log("Registration result:", result);
  
      if (result && result.success) {
        console.log("Registration successful, redirecting...");
        navigate("/profile");
      } else {
        console.error("Registration failed:", result?.error);
        setError(result?.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration exception:", err);
      setError("Connection failed: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="ui-auth-container">
      <Card variant="dark" className="ui-auth-card">
        <Card.Header>
          <h2 className="ui-auth-title">
            <FaUserPlus className="ui-auth-icon" /> Create an Account
          </h2>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <div className="ui-message ui-message-error">
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
              placeholder="Enter a username"
              required
              disabled={isProcessing}
            />
            
            <FormInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={isProcessing}
            />
            
            <FormInput
              id="confirm-password"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              disabled={isProcessing}
            />
            
            <div className="ui-form-actions">
              <Button 
                type="submit" 
                variant="primary"
                disabled={isProcessing}
                icon={<FaUserPlus />}
              >
                {isProcessing ? "Registering..." : "Register"}
              </Button>
            </div>
          </form>
          
          <div className="ui-auth-redirect">
            Already have an account? <Link to="/login" className="ui-auth-link">Login here</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
