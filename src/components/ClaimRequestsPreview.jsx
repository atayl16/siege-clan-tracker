import React, { useState, useEffect } from "react";
import { useData, useClaimRequests } from "../context/DataContext";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import { FaCheckCircle, FaUser, FaCalendarAlt, FaExclamationTriangle, FaCheck, FaTimes, FaUserPlus, FaSync } from "react-icons/fa";

import "./ClaimRequestsPreview.css";

export default function ClaimRequestsPreview({ count, onViewAllClick, onRequestProcessed }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Use the context hook to get pending requests
  const { 
    requests: allRequests, 
    loading,
    error,
    refreshRequests
  } = useClaimRequests({ status: "pending" });
  
  // Ensure we only display truly pending requests by double-checking status
  useEffect(() => {
    if (allRequests && Array.isArray(allRequests)) {
      // Filter to ensure only pending items are included
      const strictlyPendingRequests = allRequests.filter(
        req => String(req.status).toLowerCase().trim() === 'pending'
      );
      
      // Take only the 3 most recent pending requests
      setPendingRequests(strictlyPendingRequests.slice(0, 3));
    }
  }, [allRequests]);

  const { fetchers } = useData();
  
  const handleApprove = async (request) => {
    setActionLoading(request.id);
    setActionResult(null);
    
    try {
      await fetchers.supabase.processRequest(
        request.id, 
        "approved", 
        "Approved via admin dashboard", 
        request.user_id, 
        request.wom_id
      );
      
      setActionResult({
        type: 'success',
        message: `Approved claim for ${request.rsn}`
      });
      
      // Remove from local state immediately
      setPendingRequests(current => current.filter(req => req.id !== request.id));
      
      // Refresh data with SWR
      refreshRequests();
      
      // Notify parent
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err) {
      console.error("Error approving request:", err);
      setActionResult({
        type: 'error',
        message: `Error: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleDeny = async (request) => {
    setActionLoading(request.id);
    setActionResult(null);
    
    try {
      // Use the context method instead of direct Supabase call
      await fetchers.supabase.processRequest(
        request.id, 
        "denied", 
        "Denied", 
        request.user_id, 
        request.wom_id
      );
      
      setActionResult({
        type: 'success',
        message: `Denied claim for ${request.rsn}`
      });
      
      // Remove from local state immediately
      setPendingRequests(current => 
        current.filter(req => req.id !== request.id)
      );
      
      // Refresh data with SWR
      refreshRequests();
      
      // Notify parent
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err) {
      console.error("Error denying request:", err);
      setActionResult({
        type: 'error',
        message: `Failed to deny: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="ui-loading-container ui-claim-preview-loading">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading recent requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-error-message">
        <FaExclamationTriangle className="ui-error-icon" />
        Error loading claim requests: {error.message || String(error)}
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="ui-no-alerts">
        <FaCheck className="ui-success-icon" />
        <span>No pending claim requests</span>
      </div>
    );
  }

  // Count of strictly pending requests for display
  const pendingCount = allRequests?.filter(
    req => String(req.status).toLowerCase().trim() === 'pending'
  ).length || 0;

  return (
    <Card variant="dark" className="ui-claim-requests-container">
      <Card.Header className="ui-claim-requests-header">
        <div className="ui-header-with-actions">
          <h3 className="ui-claim-requests-title">
            Pending Character Claims
            <Badge variant="warning" pill className="ui-alerts-count">
              {pendingCount}
            </Badge>
          </h3>
        </div>
      </Card.Header>
      
      <Card.Body>
        {actionResult && (
          <div className={`ui-message ${actionResult.type === 'success' ? 'ui-message-success' : 'ui-message-error'}`}>
            {actionResult.type === 'success' ? (
              <FaCheckCircle className="ui-message-icon" />
            ) : (
              <FaExclamationTriangle className="ui-message-icon" />
            )}
            <span>{actionResult.message}</span>
          </div>
        )}
        
        <ul className="ui-reported-members-list">
          {pendingRequests.map(request => (
            <li key={request.id} className="ui-reported-member-item">
              <div className="ui-member-info">
                <div className="ui-reported-member-name">{request.rsn}</div>
                <div className="ui-request-details">
                  <div className="ui-request-user">
                    <FaUser className="ui-icon-left" />
                    Requested by: <strong>{request.username}</strong>
                  </div>
                  <div className="ui-request-date">
                    <FaCalendarAlt className="ui-icon-left" />
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                  
                  {request.message && (
                    <div className="ui-request-message">"{request.message}"</div>
                  )}
                </div>
              </div>
              
              <div className="ui-request-actions">
                <Button
                  variant="success" 
                  size="sm"
                  icon={<FaCheck />}
                  onClick={() => handleApprove(request)}
                  disabled={actionLoading === request.id}
                >
                  {actionLoading === request.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  variant="danger" 
                  size="sm"
                  icon={<FaTimes />}
                  onClick={() => handleDeny(request)}
                  disabled={actionLoading === request.id}
                >
                  {actionLoading === request.id ? 'Processing...' : 'Deny'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        
        {pendingCount > 3 && (
          <div className="ui-view-all-container">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewAllClick}
              className="ui-view-all-button"
            >
              View all {pendingCount} requests
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
