import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
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

      // No need to fetch user requests, since we're not showing "My Requests" tab anymore
      // and the parent component will handle refreshing data
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
        return <span className="status-badge approved">Approved</span>;
      case "denied":
        return <span className="status-badge denied">Denied</span>;
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };

  return (
    <div className="claim-player-container">
      <div className="claim-tabs">
        <button
          className={`claim-tab ${activeTab === "code" ? "active" : ""}`}
          onClick={() => setActiveTab("code")}
        >
          Use a Claim Code
        </button>
        <button
          className={`claim-tab ${activeTab === "request" ? "active" : ""}`}
          onClick={() => setActiveTab("request")}
        >
          Search Members
        </button>
        <button
          className={`claim-tab ${activeTab === "my-requests" ? "active" : ""}`}
          onClick={() => setActiveTab("my-requests")}
        >
          View My Requests
        </button>
      </div>

      {notification && (
        <div className={`notification-message ${notification.type}`}>
          {notification.message}
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      {activeTab === "code" && (
        <div className="claim-code-tab">
          <h2>Claim Your OSRS Account</h2>
          <p>
            Enter the claim code provided by admin to connect your account with your in-game
            character.
          </p>

          <form onSubmit={handleClaim}>
            <div className="form-group">
              <label>Claim Code:</label>
              <input
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Enter your claim code"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="claim-button" disabled={loading}>
              {loading ? "Processing..." : "Claim Player"}
            </button>
          </form>

          <div className="claim-info">
            <h3>How to get a claim code</h3>
            <ol>
              <li>Contact a clan admin in Discord</li>
              <li>Verify your in-game name</li>
              <li>Receive your unique claim code</li>
              <li>Enter the code above to link your account</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === "request" && (
        <div className="claim-request-tab">
          <h2>Search for your OSRS Account</h2>
          <p>Select your character from the list to request access.</p>

          <form onSubmit={handleRequestClaim}>
            <div className="form-group">
              <label>Select Your Character:</label>
              {loadingMembers ? (
                <div className="loading-indicator">
                  Loading available players...
                </div>
              ) : (
                <select
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
                <div className="info-message">
                  All players have been claimed
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Message (optional):</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add any details that might help verify your identity"
                disabled={loading}
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="claim-button"
              disabled={loading || !selectedMember}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          <div className="claim-info">
            <h3>What happens next?</h3>
            <p>After submitting your request:</p>
            <ol>
              <li>An admin will review your request</li>
              <li>They may verify your identity in Discord</li>
              <li>Once approved, you'll gain access to your player profile</li>
              <li>You can check the status in the "My Requests" tab</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === "my-requests" && (
        <div className="my-requests-tab">
          <h2>My Claim Requests</h2>

          {userRequests.length === 0 ? (
            <div className="no-requests">
              <p>You haven't submitted any player claim requests yet.</p>
              <button
                className="secondary-button"
                onClick={() => setActiveTab("request")}
              >
                Request a Player
              </button>
            </div>
          ) : (
            <div className="requests-list">
              {userRequests.map((request) => (
                <div className="request-card" key={request.id}>
                  <div className="request-header">
                    <div className="my-request-rsn">{request.rsn}</div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="request-details">
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
