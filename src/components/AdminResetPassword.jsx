import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { sha256 } from "crypto-hash"; 
import UserSelector from "./UserSelector";

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
  if (!isAuthenticated && !user?.is_admin) {
    return (
      <div className="admin-auth-error">
        <h2>Admin Access Only</h2>
        <p>You must be logged in as an administrator to reset passwords.</p>
        <button onClick={() => (window.location.href = "/login")}>
          Log In
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Reset User Password</h2>
      
      {message && (
        <div
          className={
            message.includes("Error") ? "error-message" : "success-message"
          }
        >
          {message}
        </div>
      )}

      <div className="password-reset-section">
        <h3>Step 1: Select a User</h3>
        <p className="section-description">
          Search for a user below and select the one whose password you need to reset.
        </p>
        
        <UserSelector
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUser?.id}
          disabled={isProcessing}
          viewMode="table" // Changed from dropdown to table
        />
      </div>

      {selectedUser && (
        <div className="password-reset-section">
          <h3>Step 2: Set New Password</h3>
          <form onSubmit={handleReset} className="admin-form">
            <div className="selected-user-info">
              <strong>Resetting password for: {selectedUser.username}</strong>
            </div>
            
            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isProcessing}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isProcessing}
              />
            </div>

            <button 
              type="submit" 
              className="admin-button"
              disabled={isProcessing}
            >
              {isProcessing ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
