import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
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
    return <div className="loading-preview">Loading recent requests...</div>;
  }

  return (
    <div className="claim-requests-preview">
      {actionResult && (
        <div className={`action-result ${actionResult.type}`}>
          {actionResult.message}
        </div>
      )}
      
      {recentRequests.length > 0 ? (
        <>
          <ul className="preview-list">
            {recentRequests.map(request => (
              <li key={request.id} className="preview-item">
                <div className="preview-content">
                  <span className="preview-player">{request.rsn}</span>
                  <div className="preview-details">
                    <span>Requested by <span className="preview-user">{request.username}</span></span>
                    <span className="preview-date">{new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                  {request.message && (
                    <div className="preview-message">"{request.message}"</div>
                  )}
                </div>
                <div className="preview-actions">
                  <button 
                    className="action-button approve" 
                    onClick={() => handleApprove(request)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? '...' : '✓'}
                  </button>
                  <button 
                    className="action-button deny" 
                    onClick={() => handleDeny(request)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? '...' : '✕'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          <button className="view-all-button" onClick={onViewAllClick}>
            {count > 3 ? `View All ${count} Requests` : 'Manage Requests'}
          </button>
        </>
      ) : (
        <div className="no-requests">No pending requests found</div>
      )}
    </div>
  );
}
