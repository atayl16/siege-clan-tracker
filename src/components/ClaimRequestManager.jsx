import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import "./ClaimRequestManager.css";

export default function ClaimRequestManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // "pending", "approved", "denied", "all"
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch basic request data without joins
      let query = supabase
        .from("claim_requests")
        .select("*")
        .order("created_at", { ascending: false });
  
      // Apply filter
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
  
      const { data, error } = await query;
  
      if (error) throw error;
      
      // Step 2: If we have data, fetch the related user and member info separately
      if (data && data.length > 0) {
        // Get unique user IDs and wom_ids
        const userIds = [...new Set(data.filter(req => req.user_id).map(req => req.user_id))];
        const womIds = [...new Set(data.filter(req => req.wom_id).map(req => req.wom_id))];
        
        // Fetch user data in a single query
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username')
          .in('id', userIds);
        
        if (usersError) throw usersError;
        
        // Create a lookup map for user data
        const userMap = {};
        if (usersData) {
          usersData.forEach(user => {
            userMap[user.id] = user;
          });
        }
        
        // Fetch member data in a single query
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('wom_id, name')
          .in('wom_id', womIds);
        
        if (membersError) throw membersError;
        
        // Create a lookup map for member data
        const memberMap = {};
        if (membersData) {
          membersData.forEach(member => {
            memberMap[member.wom_id] = member;
          });
        }
        
        // Combine all data
        const enhancedData = data.map(req => ({
          ...req,
          user: req.user_id ? { username: userMap[req.user_id]?.username } : null,
          member: req.wom_id ? { name: memberMap[req.wom_id]?.name } : null
        }));
        
        setRequests(enhancedData);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Error fetching claim requests:", err);
      setError("Failed to load claim requests");
    } finally {
      setLoading(false);
    }
  }, [filter]);
  
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openActionModal = (request, action) => {
    setCurrentRequest(request);
    setCurrentAction(action);
    setAdminNotes("");
    setShowNotesModal(true);
  };

  const processRequest = async (requestId, status, notes, userId, womId) => {
    setProcessingId(requestId);
    try {
      if (!requestId || !status) {
        throw new Error("Missing required information");
      }

      // First update the request status
      const { error: updateError } = await supabase
        .from("claim_requests")
        .update({
          status: status,
          admin_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, create the player claim
      if (status === "approved" && userId && womId) {
        // Check if player is already claimed
        const { data: existingClaim, error: claimCheckError } = await supabase
          .from("player_claims")
          .select("id")
          .eq("wom_id", womId)
          .single();

        if (claimCheckError && claimCheckError.code !== "PGRST116") {
          // Not found is ok
          throw claimCheckError;
        }

        if (existingClaim) {
          throw new Error("Player has already been claimed by another user");
        }

        // Create claim
        const { error: claimError } = await supabase
          .from("player_claims")
          .insert([
            {
              user_id: userId,
              wom_id: womId,
            },
          ]);

        if (claimError) throw claimError;
      }

      setSuccessMessage(
        `Request ${status === "approved" ? "approved" : "denied"} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh the list
      fetchRequests();
    } catch (err) {
      console.error("Error processing request:", err);
      setError(`Failed to process request: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAction = () => {
    if (!currentRequest || !currentAction) return;

    processRequest(
      currentRequest.id,
      currentAction,
      adminNotes,
      currentRequest.user_id,
      currentRequest.wom_id
    );
    setShowNotesModal(false);
  };

  return (
    <div className="claim-requests-manager">
      <h2>Player Claim Requests</h2>

      <div className="filter-bar">
        <button
          className={`filter-button ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pending
        </button>
        <button
          className={`filter-button ${filter === "approved" ? "active" : ""}`}
          onClick={() => setFilter("approved")}
        >
          Approved
        </button>
        <button
          className={`filter-button ${filter === "denied" ? "active" : ""}`}
          onClick={() => setFilter("denied")}
        >
          Denied
        </button>
        <button
          className={`filter-button ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {loading ? (
        <div className="loading">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="no-requests-message">
          No {filter !== "all" ? filter : ""} claim requests found.
        </div>
      ) : (
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>User</th>
                <th>OSRS Name</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className={`status-${request.status}`}>
                  <td>{request.user?.username || "Unknown User"}</td>
                  <td>{request.rsn}</td>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${request.status}`}>
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {request.status === "pending" ? (
                      <>
                        <button
                          className="action-button approve"
                          onClick={() => openActionModal(request, "approved")}
                          disabled={processingId === request.id}
                        >
                          Approve
                        </button>
                        <button
                          className="action-button deny"
                          onClick={() => openActionModal(request, "denied")}
                          disabled={processingId === request.id}
                        >
                          Deny
                        </button>
                      </>
                    ) : (
                      <button
                        className="action-button details"
                        onClick={() => {
                          setCurrentRequest(request);
                          setAdminNotes(request.admin_notes || "");
                          setShowNotesModal(true);
                          setCurrentAction("view");
                        }}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNotesModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                {currentAction === "view"
                  ? "Request Details"
                  : currentAction === "approved"
                  ? "Approve Request"
                  : "Deny Request"}
              </h3>
              <button
                className="close-button"
                onClick={() => setShowNotesModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              {currentRequest && (
                <>
                  <div className="request-info">
                    <p>
                      <strong>User:</strong>{" "}
                      {currentRequest.user?.username || "Unknown"}
                    </p>
                    <p>
                      <strong>Player Name:</strong> {currentRequest.rsn}
                    </p>
                    <p>
                      <strong>Date Requested:</strong>{" "}
                      {new Date(currentRequest.created_at).toLocaleDateString()}
                    </p>
                    {currentRequest.message && (
                      <div className="user-message">
                        <p>
                          <strong>User's Message:</strong>
                        </p>
                        <p>{currentRequest.message}</p>
                      </div>
                    )}
                    {currentAction === "view" && currentRequest.admin_notes && (
                      <div className="admin-notes-display">
                        <p>
                          <strong>Admin Notes:</strong>
                        </p>
                        <p>{currentRequest.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {currentAction !== "view" && (
                    <>
                      <div className="form-group">
                        <label>Admin Notes (optional):</label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about your decision (visible to user)"
                          rows={3}
                        />
                      </div>

                      <div className="modal-actions">
                        <button
                          className={`confirm-button ${
                            currentAction === "approved" ? "approve" : "deny"
                          }`}
                          onClick={confirmAction}
                        >
                          {currentAction === "approved"
                            ? "Approve Request"
                            : "Deny Request"}
                        </button>
                        <button
                          className="cancel-button"
                          onClick={() => setShowNotesModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {currentAction === "view" && (
                    <div className="modal-actions">
                      <button
                        className="cancel-button"
                        onClick={() => setShowNotesModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
