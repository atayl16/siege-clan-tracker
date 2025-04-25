import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { FaCheck, FaTimes, FaInfoCircle, FaUser, FaGamepad } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";

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

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" icon={<FaCheck />}>
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="danger" icon={<FaTimes />}>
            Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" icon={<FaInfoCircle />}>
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className="ui-claim-requests-manager">
      <Card.Header>
        <h2 className="ui-manager-title">Player Claim Requests</h2>
      </Card.Header>
      <Card.Body>
        <div className="ui-filter-bar">
          <Button
            variant={filter === "pending" ? "primary" : "default"}
            onClick={() => setFilter("pending")}
            className="ui-filter-button"
          >
            Pending
          </Button>
          <Button
            variant={filter === "approved" ? "primary" : "default"}
            onClick={() => setFilter("approved")}
            className="ui-filter-button"
          >
            Approved
          </Button>
          <Button
            variant={filter === "denied" ? "primary" : "default"}
            onClick={() => setFilter("denied")}
            className="ui-filter-button"
          >
            Denied
          </Button>
          <Button
            variant={filter === "all" ? "primary" : "default"}
            onClick={() => setFilter("all")}
            className="ui-filter-button"
          >
            All
          </Button>
        </div>

        {error && (
          <div className="ui-error-message">
            <FaTimes className="ui-error-icon" /> {error}
          </div>
        )}
        
        {successMessage && (
          <div className="ui-success-message">
            <FaCheck className="ui-success-icon" /> {successMessage}
          </div>
        )}

        {loading ? (
          <div className="ui-loading-indicator">
            <div className="ui-loading-spinner"></div>
            <div className="ui-loading-text">Loading requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No Requests Found"
            description={`No ${filter !== "all" ? filter : ""} claim requests found.`}
            icon={<FaGamepad size={24} />}
          />
        ) : (
          <div className="ui-requests-table-container">
            <table className="ui-requests-table">
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
                  <tr key={request.id} className={`ui-request-row ui-status-${request.status}`}>
                    <td className="ui-request-user">
                      <div className="ui-user-info">
                        <FaUser className="ui-user-icon" />
                        <span>{request.user?.username || "Unknown User"}</span>
                      </div>
                    </td>
                    <td className="ui-request-player">{request.rsn}</td>
                    <td className="ui-request-date">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="ui-request-status">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="ui-actions-cell">
                      {request.status === "pending" ? (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openActionModal(request, "approved")}
                            disabled={processingId === request.id}
                            className="ui-action-button"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openActionModal(request, "denied")}
                            disabled={processingId === request.id}
                            className="ui-action-button"
                          >
                            Deny
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => {
                            setCurrentRequest(request);
                            setAdminNotes(request.admin_notes || "");
                            setShowNotesModal(true);
                            setCurrentAction("view");
                          }}
                          className="ui-action-button"
                        >
                          Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {showNotesModal && (
          <div className="ui-modal-overlay">
            <div className="ui-modal-container">
              <div className="ui-modal-header">
                <h3 className="ui-modal-title">
                  {currentAction === "view"
                    ? "Request Details"
                    : currentAction === "approved"
                    ? "Approve Request"
                    : "Deny Request"}
                </h3>
                <button
                  className="ui-modal-close"
                  onClick={() => setShowNotesModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="ui-modal-content">
                {currentRequest && (
                  <>
                    <div className="ui-request-info">
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
                        <div className="ui-user-message">
                          <p>
                            <strong>User's Message:</strong>
                          </p>
                          <p>{currentRequest.message}</p>
                        </div>
                      )}
                      {currentAction === "view" && currentRequest.admin_notes && (
                        <div className="ui-admin-notes-display">
                          <p>
                            <strong>Admin Notes:</strong>
                          </p>
                          <p>{currentRequest.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {currentAction !== "view" && (
                      <>
                        <div className="ui-form-group">
                          <label className="ui-form-label">Admin Notes (optional):</label>
                          <textarea
                            className="ui-form-textarea"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes about your decision (visible to user)"
                            rows={3}
                          />
                        </div>

                        <div className="ui-modal-actions">
                          <Button
                            variant={currentAction === "approved" ? "success" : "danger"}
                            onClick={confirmAction}
                            className="ui-confirm-button"
                          >
                            {currentAction === "approved"
                              ? "Approve Request"
                              : "Deny Request"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setShowNotesModal(false)}
                            className="ui-cancel-button"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}

                    {currentAction === "view" && (
                      <div className="ui-modal-actions">
                        <Button
                          variant="secondary"
                          onClick={() => setShowNotesModal(false)}
                          className="ui-close-button"
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
