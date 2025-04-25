import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { sha256 } from "crypto-hash"; 
import UserSelector from "../UserSelector";
import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { FaLock, FaUser, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import "./AdminResetPassword.css";

export default function AdminResetPassword() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const { user, isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessage(""); // Clear any previous messages
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!selectedUser) {
      setMessage("Please select a user");
      setIsProcessing(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords don't match");
      setIsProcessing(false);
      return;
    }

    try {
      // Hash the password using the same method as in AuthContext.js
      const passwordHash = await sha256(newPassword);
      
      // Update the password hash directly in the database
      const { error } = await supabase
        .from("users")
        .update({ password_hash: passwordHash })
        .eq("id", selectedUser.id);

      if (error) throw error;

      setMessage("Password has been reset successfully");
      // Clear the form
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage(`Error: ${error.message || "Failed to reset password"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check both isAuthenticated and user?.is_admin
  if (!isAuthenticated || !user?.is_admin) {
    return (
      <EmptyState
        title="Admin Access Only"
        description="You must be logged in as an administrator to reset passwords."
        icon={<FaExclamationTriangle className="ui-access-denied-icon" />}
        action={<Button variant="primary" onClick={() => (window.location.href = "/login")}>Log In</Button>}
      />
    );
  }

  return (
    <div className="ui-admin-reset-password">
      <Card variant="dark">
        <Card.Header>
          <h2 className="ui-admin-header">
            <FaLock className="ui-icon-left" /> Reset User Password
          </h2>
        </Card.Header>
        
        <Card.Body>
          {message && (
            <div className={`ui-message ${message.includes("Error") ? "ui-message-error" : "ui-message-success"}`}>
              {message.includes("Error") ? (
                <FaExclamationTriangle className="ui-message-icon" />
              ) : (
                <FaCheckCircle className="ui-message-icon" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="ui-section">
            <h3 className="ui-section-title">
              <FaUser className="ui-icon-left" /> Step 1: Select a User
            </h3>
            <p className="ui-section-description">
              Search for a user below and select the one whose password you need to reset.
            </p>
            
            <UserSelector
              onUserSelect={handleUserSelect}
              selectedUserId={selectedUser?.id}
              disabled={isProcessing}
              viewMode="table"
            />
          </div>

          {selectedUser && (
            <div className="ui-section">
              <h3 className="ui-section-title">
                <FaLock className="ui-icon-left" /> Step 2: Set New Password
              </h3>
              <form onSubmit={handleReset} className="ui-form">
                <div className="ui-selected-user">
                  <strong>Resetting password for:</strong> {selectedUser.username}
                </div>
                
                <div className="ui-form-group">
                  <label htmlFor="new-password">New Password:</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    disabled={isProcessing}
                    className="ui-form-input"
                  />
                </div>

                <div className="ui-form-group">
                  <label htmlFor="confirm-password">Confirm Password:</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={isProcessing}
                    className="ui-form-input"
                  />
                </div>

                <div className="ui-form-actions">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={isProcessing}
                    icon={isProcessing ? null : <FaLock />}
                  >
                    {isProcessing ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
