import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useClaimRequests } from "../hooks/useClaimRequests"; // New hook for claim requests
import { useMembers } from "../hooks/useMembers"; // New hook for members
import { FaCheck, FaTimes, FaClock, FaInfoCircle } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Tabs from "./ui/Tabs";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

import "./ClaimPlayer.css";

export default function ClaimPlayer({ onRequestSubmitted }) {
  // Claiming is request-then-approve: the member picks their character and an
  // admin approves it. There used to be a "Use a Claim Code" tab as well, but
  // nothing could create codes (claim_codes is service-role only and no admin
  // screen generated them), so it was removed.

  // Local state for form inputs and UI
  const [selectedMember, setSelectedMember] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("request");

  const { user } = useAuth();

  // Get data from hooks
  const {
    requests: userRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshRequests,
    createClaimRequest,
  } = useClaimRequests();

  // useMembers exposes refreshMembers, not refresh - asking for the wrong name
  // left refreshAvailableMembers undefined, and the effect below calls it on
  // every tab switch.
  const {
    members: availableMembers,
    loading: membersLoading,
    error: membersError,
    refreshMembers: refreshAvailableMembers,
  } = useMembers();

  // Get fresh data when switching tabs
  useEffect(() => {
    if (activeTab === "request" && user) {
      refreshAvailableMembers();
    }
    if (activeTab === "my-requests" && user) {
      refreshRequests();
    }
  }, [activeTab, user, refreshAvailableMembers, refreshRequests]);

  const handleRequestClaim = async (e) => {
    e.preventDefault();

    setError(null);
    setNotification(null);

    if (!user) {
      setError("You must be logged in to request a player claim");
      return;
    }

    // Find the selected member from the availableMembers array
    const memberObj = availableMembers?.find(
      (member) => member.wom_id === parseInt(selectedMember, 10)
    );

    if (!memberObj) {
      setError("Please select a valid player");
      return;
    }

    setLoading(true);
    try {
      // Use the new createClaimRequest method
      await createClaimRequest({
        user_id: user.id,
        wom_id: parseInt(selectedMember, 10),
        rsn: memberObj.name,
        message: message.trim() || null,
        status: "pending",
      });

      setNotification({
        type: "success",
        message: "Your claim request has been submitted",
      });
      setSelectedMember("");
      setMessage("");
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
        <Tabs.Tab tabId="request" label="Search Members">
            <div className="ui-claim-tab-content">
              <h2 className="ui-claim-heading">Search for your OSRS Account</h2>
              <p className="ui-claim-description">
                Select your character from the list to request access.
              </p>

              {notification && (
                <div
                  className={`ui-notification-message ui-notification-${notification.type}`}
                  role="status"
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
                <div className="ui-error-message" role="alert">
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
            </div>
          </Tabs.Tab>

        <Tabs.Tab tabId="my-requests" label="View My Requests">
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
