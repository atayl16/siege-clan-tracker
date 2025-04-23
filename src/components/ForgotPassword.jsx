import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./AdminLogin.css";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Record the password reset request
    try {
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting request:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>Password Reset</h2>
      {!submitted ? (
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
          <button type="submit" className="login-button">
            Submit Reset Request
          </button>
        </form>
      ) : (
        <div className="success-message">
          <p>
            Your password reset request has been submitted. Please contact an
            admin in-game to verify your identity and reset your password.
          </p>
          <Link to="/login" className="back-to-login">
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
}
