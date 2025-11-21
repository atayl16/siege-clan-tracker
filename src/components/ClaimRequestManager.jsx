import React, { useState, useEffect, useCallback } from "react";
import { useClaimRequests } from "../hooks/useClaimRequests"; // Updated to use new hook
import { FaCheck, FaTimes, FaInfoCircle, FaUser, FaGamepad } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";

import "./ClaimRequestManager.css";

export default function ClaimRequestManager() {
  const [filter, setFilter] = useState("pending");
  const [successMessage, setSuccessMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);

  // Use the new hook to get all requests
  const {
    requests: allRequests,
    loading,
    error: fetchError,
    refresh: refreshRequests,
    processRequest,
  } = useClaimRequests();

  // Apply local filtering based on the current filter
  const filteredRequests = allRequests?.filter((request) => {
    if (filter === "all") return true;

    // Normalize case for comparison
    const requestStatus = String(request.status || "").toLowerCase();
    const filterValue = String(filter).toLowerCase();

    return requestStatus === filterValue;
  });

  // Refresh requests when the filter changes
  useEffect(() => {
    refreshRequests();
  }, [filter, refreshRequests]);

  const handleFilterChange = useCallback(
    (newFilter) => {
      if (newFilter === filter) return;
      setFilter(newFilter);
    },
    [filter]
  );

  const openActionModal = (request, action) => {
    setCurrentRequest(request);
    setCurrentAction(action);
    setAdminNotes("");
    setShowNotesModal(true);
  };

  const confirmAction = async () => {
    if (!currentRequest || !currentAction) return;

    setProcessingId(currentRequest.id);
    try {
      await processRequest(
        currentRequest.id,
        currentAction,
        adminNotes,
        currentRequest.user_id,
        currentRequest.wom_id
      );

      setSuccessMessage(
        `Request ${currentAction === "approved" ? "approved" : "denied"} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      refreshRequests();
    } catch (err) {
      console.error("Error processing request:", err);
      setActionError(`Failed to process request: ${err.message}`);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setProcessingId(null);
      setShowNotesModal(false);
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = String(status || "").toLowerCase();

    switch (normalizedStatus) {
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
      <Card.Body>
        <div className="ui-filter-bar">
          <Button
            variant={filter === "pending" ? "primary" : "default"}
            onClick={() => handleFilterChange("pending")}
            className="ui-filter-button"
          >
            Pending
          </Button>
          <Button
            variant={filter === "approved" ? "primary" : "default"}
            onClick={() => handleFilterChange("approved")}
            className="ui-filter-button"
          >
            Approved
          </Button>
          <Button
            variant={filter === "denied" ? "primary" : "default"}
            onClick={() => handleFilterChange("denied")}
            className="ui-filter-button"
          >
            Denied
          </Button>
          <Button
            variant={filter === "all" ? "primary" : "default"}
            onClick={() => handleFilterChange("all")}
            className="ui-filter-button"
          >
            All
          </Button>
        </div>

        {fetchError && (
          <div className="ui-error-message">
            <FaTimes className="ui-error-icon" /> Error loading requests:{" "}
            {fetchError.message || fetchError}
          </div>
        )}

        {actionError && (
          <div className="ui-error-message">
            <FaTimes className="ui-error-icon" /> {actionError}
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
            <div className="ui-loading-text">
              Loading {filter !== "all" ? filter : ""} requests...
            </div>
          </div>
        ) : !filteredRequests || filteredRequests.length === 0 ? (
          <EmptyState
            title="No Requests Found"
            description={`No ${
              filter !== "all" ? filter : ""
            } claim requests found.`}
            icon={<FaGamepad className="ui-empty-state-icon" />}
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
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className={`ui-request-row ui-status-${request.status}`}
                  >
                    <td className="ui-request-user">
                      <div className="ui-user-info">
                        <FaUser className="ui-user-icon" />
                        <span>{request.username || "Unknown User"}</span>
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
                      {String(request.status).toLowerCase() === "pending" ? (
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
          <Modal
            isOpen={showNotesModal}
            title={
              currentAction === "view"
                ? "Request Details"
                : currentAction === "approved"
                ? "Approve Request"
                : "Deny Request"
            }
            onClose={() => setShowNotesModal(false)}
          >
            {currentRequest && (
              <>
                <div className="ui-request-info">
                  <p>
                    <strong>User:</strong>{" "}
                    {currentRequest.username || "Unknown"}
                  </p>
                  <p>
                    <strong>Player Name:</strong> {currentRequest.rsn}
                  </p>
                  <p>
                    <strong>Date Requested:</strong>{" "}
                    {new Date(currentRequest.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {getStatusBadge(currentRequest.status)}
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
                      <label className="ui-form-label">
                        Admin Notes (optional):
                      </label>
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
                        variant={
                          currentAction === "approved" ? "success" : "danger"
                        }
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
          </Modal>
        )}
      </Card.Body>
    </Card>
  );
}
