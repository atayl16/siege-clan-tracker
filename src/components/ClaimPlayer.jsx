import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUserClaimRequests, useAvailableMembers, useData } from "../context/DataContext";
import { FaCheck, FaTimes, FaClock, FaInfoCircle } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Tabs from "./ui/Tabs";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

import "./ClaimPlayer.css";

export default function ClaimPlayer({ onRequestSubmitted }) {
  // Local state for form inputs and UI
  const [claimCode, setClaimCode] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("code");

  const { user, claimPlayer } = useAuth();
  const { fetchers } = useData(); // Add this for DataContext
  
  // Get data from context hooks
  const { 
    requests: userRequests, 
    loading: requestsLoading, 
    error: requestsError,
    refreshRequests 
  } = useUserClaimRequests(user?.id);
  
  const {
    members: availableMembers,
    loading: membersLoading,
    error: membersError,
    refreshAvailableMembers
  } = useAvailableMembers();

  // Get fresh data when switching tabs
  useEffect(() => {
    if (activeTab === "request" && user) {
      refreshAvailableMembers();
    }
    if (activeTab === "my-requests" && user) {
      refreshRequests();
    }
  }, [activeTab, user, refreshAvailableMembers, refreshRequests]);

  const handleClaim = async (e) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to claim an account");
      return;
    }

    setLoading(true);
    setError(null);
    setNotification(null);

    try {
      const result = await claimPlayer(claimCode.trim());

      if (result.success) {
        setNotification({
          type: "success",
          message: result.message,
        });
        setClaimCode(""); // Clear the input on success
        
        // Refresh data after a successful claim
        refreshAvailableMembers();
        refreshRequests();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to process claim");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClaim = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to request a player claim");
      return;
    }
  
    setLoading(true);
    try {
      // Use the context method instead of direct insert
      await fetchers.supabase.createClaimRequest({
        user_id: user.id,
        wom_id: parseInt(selectedMember, 10),
        rsn: memberObj.name,
        message: message.trim() || null,
        status: "pending",
      });
      
      setNotification("Your claim request has been submitted");
      refreshRequests();
    } catch (err) {
      console.error("Error creating claim request:", err);
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" icon={<FaCheck />}>Approved</Badge>;
      case "denied":
        return <Badge variant="danger" icon={<FaTimes />}>Denied</Badge>;
      default:
        return <Badge variant="warning" icon={<FaClock />}>Pending</Badge>;
    }
  };

  return (
    <Card className="ui-claim-player-container">
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        className="ui-claim-tabs"
      >
        <Tabs.Tab tabId="code" label="Use a Claim Code">
          <div className="ui-claim-tab-content">
            <h2 className="ui-claim-heading">Claim Your OSRS Account</h2>
            <p className="ui-claim-description">
              Enter the claim code provided by admin to connect your account
              with your in-game character.
            </p>

            {notification && (
              <div
                className={`ui-notification-message ui-notification-${notification.type}`}
              >
                {notification.type === "success" ? (
                  <FaCheck className="ui-notification-icon" />
                ) : (
                  <FaInfoCircle className="ui-notification-icon" />
                )}
                {notification.message}
              </div>
            )}

            {error && (
              <div className="ui-error-message">
                <FaTimes className="ui-error-icon" />
                {error}
              </div>
            )}

            <form onSubmit={handleClaim} className="ui-claim-form">
              <div className="ui-form-group">
                <label className="ui-form-label">Claim Code:</label>
                <input
                  className="ui-form-input"
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="Enter your claim code"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="ui-claim-button"
                disabled={loading}
                fullWidth
              >
                {loading ? "Processing..." : "Claim Player"}
              </Button>
            </form>

            <Card variant="dark" className="ui-info-card">
              <Card.Body>
                <h3 className="ui-info-heading">How to get a claim code</h3>
                <ol className="ui-info-list">
                  <li>Contact a clan admin in Discord</li>
                  <li>Verify your in-game name</li>
                  <li>Receive your unique claim code</li>
                  <li>Enter the code above to link your account</li>
                </ol>
              </Card.Body>
            </Card>
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="request" label="Search Members">
          <div className="ui-claim-tab-content">
            <h2 className="ui-claim-heading">Search for your OSRS Account</h2>
            <p className="ui-claim-description">
              Select your character from the list to request access.
            </p>

            {notification && (
              <div
                className={`ui-notification-message ui-notification-${notification.type}`}
              >
                {notification.type === "success" ? (
                  <FaCheck className="ui-notification-icon" />
                ) : (
                  <FaInfoCircle className="ui-notification-icon" />
                )}
                {notification.message}
              </div>
            )}

            {error && (
              <div className="ui-error-message">
                <FaTimes className="ui-error-icon" />
                {error}
              </div>
            )}

            {membersError && (
              <div className="ui-error-message">
                <FaTimes className="ui-error-icon" />
                Error loading members: {membersError.message || membersError}
              </div>
            )}

            <form onSubmit={handleRequestClaim} className="ui-claim-form">
              <div className="ui-form-group">
                <label className="ui-form-label">Select Your Character:</label>
                {membersLoading ? (
                  <div className="ui-loading-indicator">
                    <div className="ui-loading-spinner"></div>
                    <div className="ui-loading-text">
                      Loading available players...
                    </div>
                  </div>
                ) : (
                  <select
                    className="ui-form-select"
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">-- Select your character --</option>
                    {availableMembers?.map((member) => (
                      <option key={member.wom_id} value={member.wom_id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                )}
                {availableMembers?.length === 0 && !membersLoading && (
                  <div className="ui-info-message">
                    All players have been claimed
                  </div>
                )}
              </div>

              <div className="ui-form-group">
                <label className="ui-form-label">Message (optional):</label>
                <textarea
                  className="ui-form-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any details that might help verify your identity"
                  disabled={loading}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="ui-claim-button"
                disabled={loading || !selectedMember}
                fullWidth
              >
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>

            <Card variant="dark" className="ui-info-card">
              <Card.Body>
                <h3 className="ui-info-heading">What happens next?</h3>
                <p>After submitting your request:</p>
                <ol className="ui-info-list">
                  <li>An admin will review your request</li>
                  <li>They may verify your identity in Discord</li>
                  <li>
                    Once approved, you'll gain access to your player profile
                  </li>
                  <li>You can check the status in the "My Requests" tab</li>
                </ol>
              </Card.Body>
            </Card>
          </div>
        </Tabs.Tab>

        <Tabs.Tab
          tabId="my-requests"
          label="View My Requests"
        >
          <div className="ui-claim-tab-content">
            <h2 className="ui-claim-heading">My Claim Requests</h2>
            {requestsError && (
              <div className="ui-error-message">
                <FaTimes className="ui-error-icon" />
                Error loading requests: {requestsError.message || requestsError}
              </div>
            )}

            {requestsLoading ? (
              <div className="ui-loading-indicator">
                <div className="ui-loading-spinner"></div>
                <div className="ui-loading-text">Loading your requests...</div>
              </div>
            ) : userRequests?.length === 0 ? (
              <EmptyState
                title="No Requests Yet"
                description="You haven't submitted any player claim requests yet"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setActiveTab("request")}
                  >
                    Request a Player
                  </Button>
                }
              />
            ) : (
              <div className="ui-requests-list">
                {userRequests.map((request) => (
                  <Card key={request.id} className="ui-request-card">
                    <Card.Header className="ui-request-header">
                      <div className="ui-request-title">{request.rsn}</div>
                      {getStatusBadge(request.status)}
                    </Card.Header>
                    <Card.Body>
                      <div className="ui-request-details">
                        <p>
                          <strong>Requested:</strong>{" "}
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.message && (
                          <p>
                            <strong>Your message:</strong> {request.message}
                          </p>
                        )}
                        {request.admin_notes &&
                          request.status !== "pending" && (
                            <p>
                              <strong>Admin notes:</strong>{" "}
                              {request.admin_notes}
                            </p>
                          )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs.Tab>
      </Tabs>
    </Card>
  );
}
