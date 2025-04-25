import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import { FaCheckCircle, FaTimesCircle, FaUser, FaCalendarAlt, FaExclamationTriangle, FaCheck, FaTimes, FaUserPlus } from "react-icons/fa";

import "./ClaimRequestsPreview.css";

export default function ClaimRequestsPreview({ count, onViewAllClick, onRequestProcessed }) {
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionResult, setActionResult] = useState(null);

  useEffect(() => {
    fetchRecentRequests();
  }, [count]);
  
  const fetchRecentRequests = async () => {
    try {
      setLoading(true);
      // Fetch 3 most recent pending claim requests
      const { data, error } = await supabase
        .from("claim_requests")
        .select("id, rsn, wom_id, created_at, user_id, message")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      
      // Fetch usernames for these requests
      if (data.length > 0) {
        const userIds = [...new Set(data.map(req => req.user_id))];
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, username')
          .in('id', userIds);
          
        if (!userError && userData) {
          const userMap = {};
          userData.forEach(user => {
            userMap[user.id] = user.username;
          });
          
          const enhancedData = data.map(req => ({
            ...req,
            username: userMap[req.user_id] || "Unknown"
          }));
          
          setRecentRequests(enhancedData);
        } else {
          setRecentRequests(data);
        }
      } else {
        setRecentRequests([]);
      }
    } catch (err) {
      console.error("Error fetching claim requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setActionLoading(request.id);
    setActionResult(null);
    
    try {
      // Step 1: Check if player is already claimed
      const { data: existingClaims, error: claimsError } = await supabase
        .from('player_claims')
        .select('*')
        .eq('wom_id', request.wom_id);
        
      if (claimsError) throw claimsError;
      
      if (existingClaims && existingClaims.length > 0) {
        setActionResult({
          type: 'error',
          message: 'Player has already been claimed'
        });
        return;
      }
      
      // Step 2: Create a claim record
      const { error: claimError } = await supabase
        .from('player_claims')
        .insert([{
          user_id: request.user_id,
          wom_id: request.wom_id,
        }]);
        
      if (claimError) throw claimError;
      
      // Step 3: Update the request status
      const { error: updateError } = await supabase
        .from('claim_requests')
        .update({ 
          status: 'approved',
          admin_notes: 'Approved'
        })
        .eq('id', request.id);
        
      if (updateError) throw updateError;
      
      // Success
      setActionResult({
        type: 'success',
        message: `Approved claim for ${request.rsn}`
      });
      
      // Remove from local list and notify parent
      setRecentRequests(prev => prev.filter(req => req.id !== request.id));
      if (onRequestProcessed) {
        onRequestProcessed();
      }
      
    } catch (err) {
      console.error("Error approving request:", err);
      setActionResult({
        type: 'error',
        message: `Failed to approve: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleDeny = async (request) => {
    setActionLoading(request.id);
    setActionResult(null);
    
    try {
      // Update the request status
      const { error: updateError } = await supabase
        .from('claim_requests')
        .update({ 
          status: 'denied',
          admin_notes: 'Denied'
        })
        .eq('id', request.id);
        
      if (updateError) throw updateError;
      
      // Success
      setActionResult({
        type: 'success',
        message: `Denied claim for ${request.rsn}`
      });
      
      // Remove from local list and notify parent
      setRecentRequests(prev => prev.filter(req => req.id !== request.id));
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

  if (recentRequests.length === 0) {
    return (
      <EmptyState
        title="No Character Claims"
        description="There are no pending character claim requests."
        icon={<FaUserPlus className="ui-empty-state-icon" />}
        action={
          <Button variant="secondary" size="sm" onClick={() => fetchRecentRequests()}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <Card variant="dark" className="ui-claim-requests-container">
      <Card.Header className="ui-claim-requests-header">
        <h3 className="ui-claim-requests-title">
          Pending Character Claims
          <Badge variant="warning" pill className="ui-alerts-count">
            {count || recentRequests.length}
          </Badge>
        </h3>
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
          {recentRequests.map(request => (
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
        
        {count > 3 && (
          <div className="ui-view-all-container">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewAllClick}
              className="ui-view-all-button"
            >
              View all {count} requests
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
