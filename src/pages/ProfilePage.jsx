import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import ClaimPlayer from "../components/ClaimPlayer";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, userClaims } = useAuth();
  const [userRequests, setUserRequests] = useState([]);
  
  // Memoize the fetchUserRequests function with useCallback
    
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
  
  // Fetch user's claim requests when component mounts
  useEffect(() => {
    if (user) {
      fetchUserRequests();
    }
  }, [user, fetchUserRequests]);

  if (!user) {
    return (
      <div className="profile-not-logged-in">
        <h2>Please Log In</h2>
        <p>You need to be logged in to view your profile.</p>
        <div className="auth-links">
          <Link to="/login" className="btn btn-primary">Log In</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>
    );
  }
  
  // Check if user has any claims or pending requests
  const hasClaimsOrRequests = userClaims.length > 0 || userRequests.length > 0;

  return (
    <div className="profile-container">
      <h1>Your Profile</h1>
      
      <div className="profile-section user-info">
        <h2>Account Information</h2>
        <div className="profile-details">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="profile-section claimed-players">
        <h2>Your Characters</h2>
        {!hasClaimsOrRequests ? (
          <div className="no-claims">
            <p>You haven't claimed any players yet.</p>
          </div>
        ) : (
          <div className="player-grid">
            {/* Show claimed characters */}
            {userClaims.map(claim => (
              <div className="player-card" key={`claim-${claim.id}`}>
                <div className="player-card-header">
                  <h3>{claim.members.name}</h3>
                  <div className="player-status claimed">Claimed</div>
                </div>
                <div className="player-card-content">
                  <div className="player-stat">
                    <span className="stat-label">Combat Level</span>
                    <span className="stat-value">{claim.members.current_lvl || 3}</span>
                  </div>
                  <div className="player-stat">
                    <span className="stat-label">EHB</span>
                    <span className="stat-value">{claim.members.ehb || 0}</span>
                  </div>
                  <div className="player-stat">
                    <span className="stat-label">Siege Score</span>
                    <span className="stat-value">{claim.members.siege_score || 0}</span>
                  </div>
                </div>
                <div className="player-card-footer">
                  <p>Claimed on {new Date(claim.claimed_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            
            {/* Show pending requests */}
            {userRequests.map(request => (
              <div className="player-card pending-request" key={`request-${request.id}`}>
                <div className="player-card-header">
                  <h3>{request.rsn}</h3>
                  <div className="player-status pending">Pending Approval</div>
                </div>
                <div className="player-card-content">
                  <div className="player-stat">
                    <span className="stat-label">Combat Level</span>
                    <span className="stat-value">{request.member?.current_lvl || '?'}</span>
                  </div>
                  <div className="player-stat">
                    <span className="stat-label">EHB</span>
                    <span className="stat-value">{request.member?.ehb || '?'}</span>
                  </div>
                  <div className="player-stat">
                    <span className="stat-label">Siege Score</span>
                    <span className="stat-value">{request.member?.siege_score || '?'}</span>
                  </div>
                </div>
                <div className="player-card-footer">
                  <p>Requested on {new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="profile-section claim-section">
        <ClaimPlayer onRequestSubmitted={fetchUserRequests} />
      </div>
    </div>
  );
}
