import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { FaCheck, FaTimes, FaClock, FaInfoCircle } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Tabs from "./ui/Tabs";
import FormInput from "./ui/FormInput";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

import "./ClaimPlayer.css";

export default function ClaimPlayer({ onRequestSubmitted }) {
  const [claimCode, setClaimCode] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("code");
  const [userRequests, setUserRequests] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const { user, claimPlayer } = useAuth();

  const fetchUserRequests = useCallback(async () => {
    if (!user) return;
  
    try {
      // Step 1: Fetch basic request data without joins
      const { data, error } = await supabase
        .from("claim_requests")
        .select("*")  // Use simple select without joins
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
  
      if (error) throw error;
      
      // Step 2: If we have data, fetch the related member info separately
      if (data && data.length > 0) {
        const womIds = data.filter(req => req.wom_id).map(req => req.wom_id);
        
        if (womIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from('members')
            .select('wom_id, name')
            .in('wom_id', womIds);
          
          if (!membersError) {
            // Create a lookup map for member data
            const memberMap = {};
            membersData.forEach(member => {
              memberMap[member.wom_id] = member;
            });
            
            // Attach member data to each request
            const enhancedData = data.map(req => ({
              ...req,
              member: req.wom_id ? memberMap[req.wom_id] : null
            }));
            
            setUserRequests(enhancedData);
            return;
          }
        }
      }
      
      // If we don't have member data or there was an error, just use the basic request data
      setUserRequests(data || []);
    } catch (err) {
      console.error("Error fetching user requests:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserRequests();
    }
  }, [user, fetchUserRequests]);

  useEffect(() => {
    if (activeTab === "request") {
      fetchAvailableMembers();
    }
  }, [activeTab]);

  const fetchAvailableMembers = async () => {
    try {
      setLoadingMembers(true);
  
      // Get all members
      const { data: allMembers, error: membersError } = await supabase
        .from("members")
        .select("wom_id, name")
        .order("name");
  
      if (membersError) throw membersError;
  
      // Get already claimed players
      const { data: claimedPlayers, error: claimsError } = await supabase
        .from("player_claims")
        .select("wom_id");
  
      if (claimsError) throw claimsError;
  
      // Get pending claim requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from("claim_requests")
        .select("wom_id")
        .eq("status", "pending");
  
      if (pendingError) throw pendingError;
  
      // Create sets of claimed and pending request IDs
      const claimedIds = new Set(claimedPlayers.map((p) => p.wom_id));
      const pendingIds = new Set(pendingRequests.map((p) => p.wom_id));
  
      // Filter out both claimed players and those with pending requests
      const available = allMembers.filter(
        (m) => !claimedIds.has(m.wom_id) && !pendingIds.has(m.wom_id)
      );
  
      setAvailableMembers(available);
    } catch (err) {
      console.error("Error fetching available members:", err);
      setError("Failed to load available members");
    } finally {
      setLoadingMembers(false);
    }
  };

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

    if (!selectedMember) {
      setError("Please select a player");
      return;
    }

    setLoading(true);
    setError(null);
    setNotification(null);

    try {
      // Find selected member details
      const memberObj = availableMembers.find(
        (m) => m.wom_id.toString() === selectedMember.toString()
      );
      if (!memberObj) {
        throw new Error("Selected player not found");
      }

      // Check for existing requests for this player
      const { data: existingRequests, error: requestsError } = await supabase
        .from("claim_requests")
        .select("id, status")
        .eq("wom_id", selectedMember)
        .eq("status", "pending");

      if (requestsError) throw requestsError;

      if (existingRequests && existingRequests.length > 0) {
        setError("A request for this player is already pending");
        setLoading(false);
        return;
      }

      // Create the claim request
      const { error: insertError } = await supabase
        .from("claim_requests")
        .insert([
          {
            user_id: user.id,
            wom_id: selectedMember,
            rsn: memberObj.name,
            message: message.trim() || null,
          },
        ]);

      if (insertError) throw insertError;

      setNotification({
        type: "success",
        message: "Your claim request has been submitted for review",
      });
      setSelectedMember("");
      setMessage("");

      // Call the parent component's callback to refresh request data
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }

      // Switch to code tab after successful submission
      setActiveTab("code");
    } catch (err) {
      console.error("Error requesting claim:", err);
      setError(`Failed to submit request: ${err.message}`);
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
      <Tabs activeTab={activeTab} onChange={setActiveTab} className="ui-claim-tabs">
        <Tabs.Tab tabId="code" label="Use a Claim Code">
          <div className="ui-claim-tab-content">
            <h2 className="ui-claim-heading">Claim Your OSRS Account</h2>
            <p className="ui-claim-description">
              Enter the claim code provided by admin to connect your account with your in-game
              character.
            </p>

            {notification && (
              <div className={`ui-notification-message ui-notification-${notification.type}`}>
                {notification.type === "success" ? <FaCheck className="ui-notification-icon" /> : <FaInfoCircle className="ui-notification-icon" />}
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
            <p className="ui-claim-description">Select your character from the list to request access.</p>

            {notification && (
              <div className={`ui-notification-message ui-notification-${notification.type}`}>
                {notification.type === "success" ? <FaCheck className="ui-notification-icon" /> : <FaInfoCircle className="ui-notification-icon" />}
                {notification.message}
              </div>
            )}
            
            {error && (
              <div className="ui-error-message">
                <FaTimes className="ui-error-icon" />
                {error}
              </div>
            )}

            <form onSubmit={handleRequestClaim} className="ui-claim-form">
              <div className="ui-form-group">
                <label className="ui-form-label">Select Your Character:</label>
                {loadingMembers ? (
                  <div className="ui-loading-indicator">
                    Loading available players...
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
                    {availableMembers.map((member) => (
                      <option key={member.wom_id} value={member.wom_id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                )}
                {availableMembers.length === 0 && !loadingMembers && (
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
                  <li>Once approved, you'll gain access to your player profile</li>
                  <li>You can check the status in the "My Requests" tab</li>
                </ol>
              </Card.Body>
            </Card>
          </div>
        </Tabs.Tab>

        <Tabs.Tab 
          tabId="my-requests" 
          label="View My Requests"
          badge={userRequests.length > 0 ? userRequests.length : null}
        >
          <div className="ui-claim-tab-content">
            <h2 className="ui-claim-heading">My Claim Requests</h2>

            {userRequests.length === 0 ? (
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
