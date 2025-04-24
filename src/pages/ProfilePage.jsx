import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import ClaimPlayer from "../components/ClaimPlayer";
import GoalsList from "../components/goals/GoalsList";
import PlayerGoalSummary from "../components/goals/PlayerGoalSummary";
import { updatePlayerGoals } from "../services/goalProgressService";
import { FaUser, FaFlag, FaClock, FaCog } from "react-icons/fa";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, userClaims } = useAuth();
  const [userRequests, setUserRequests] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [activeTab, setActiveTab] = useState("characters");
    
  // Memoize the fetchUserRequests function with useCallback
  const fetchUserRequests = useCallback(async () => {
    if (!user) return;
  
    try {
      // Only fetch pending requests
      const { data, error } = await supabase
        .from("claim_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
      
      // Fetch the related member info separately
      if (data && data.length > 0) {
        const womIds = data.filter(req => req.wom_id).map(req => req.wom_id);
        
        if (womIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from('members')
            .select('wom_id, name')
            .in('wom_id', womIds);
          
          if (!membersError) {
            const memberMap = {};
            membersData.forEach(member => {
              memberMap[member.wom_id] = member;
            });
            
            const enhancedData = data.map(req => ({
              ...req,
              member: req.wom_id ? memberMap[req.wom_id] : null
            }));
            
            setUserRequests(enhancedData);
            return;
          }
        }
      }
      
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

  // Handle showing goals
  const handleShowGoals = (player) => {
    setActivePlayer(player);
    setActiveTab("goals");
  };

  // Update goals effect
  useEffect(() => {
    if (user && userClaims.length > 0) {
      const updateGoals = async () => {
        try {
          for (const claim of userClaims) {
            await updatePlayerGoals(claim.wom_id, user.id);
          }
        } catch (err) {
          console.error('Error updating goals:', err);
        }
      };
      
      updateGoals();
    }
  }, [user, userClaims]);

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

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="user-summary">
          <div className="username">{user.username}</div>
          <div className="member-since">
            Member since {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === "characters" ? "active" : ""}`}
          onClick={() => setActiveTab("characters")}
        >
          <FaUser /> <span>Characters</span>
        </button>
        <button
          className={`tab-button ${activeTab === "goals" ? "active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          <FaFlag /> <span>Goals</span>
        </button>
        <button
          className={`tab-button ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
          data-count={userRequests.length}
        >
          <FaClock /> <span>Requests</span>
          {userRequests.length > 0 && (
            <span className="badge">{userRequests.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <FaCog /> <span>Account</span>
        </button>
      </div>

      <div className="tab-content">
        {/* Characters Tab */}
        {activeTab === "characters" && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Your Characters</h2>
              <button
                className="action-button"
                onClick={() => setActiveTab("requests")}
              >
                Claim New Character
              </button>
            </div>

            {userClaims.length === 0 ? (
              <div className="empty-state">
                <h3>No Characters Yet</h3>
                <p>
                  You haven't claimed any characters yet. Click "Claim New
                  Character" to get started.
                </p>
              </div>
            ) : (
              <div className="character-list">
                {userClaims.map((claim) => (
                  <div className="character-card" key={`claim-${claim.id}`}>
                    <div className="character-info">
                      <div className="character-name">{claim.members.name}</div>
                      <div className="character-badge">Claimed</div>
                    </div>

                    <div className="character-stats">
                      <div className="stat">
                        <div className="stat-value">
                          {claim.members.current_lvl || 3}
                        </div>
                        <div className="stat-label">Combat Level</div>
                      </div>
                      <div className="stat">
                        <div className="stat-value">
                          {claim.members.ehb || 0}
                        </div>
                        <div className="stat-label">EHB</div>
                      </div>
                      <div className="stat">
                        <div className="stat-value">
                          {claim.members.siege_score || 0}
                        </div>
                        <div className="stat-label">Siege Score</div>
                      </div>
                    </div>

                    <PlayerGoalSummary
                      playerId={claim.members.wom_id}
                      userId={user.id}
                    />

                    <div className="character-actions">
                      <button
                        className="action-button primary"
                        onClick={() => handleShowGoals(claim.members)}
                      >
                        Manage Goals
                      </button>
                      <div className="claim-date">
                        Claimed on{" "}
                        {new Date(claim.claimed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === "goals" && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Character Goals</h2>
            </div>
        
            {userClaims.length === 0 ? (
              <div className="empty-state">
                <h3>No Characters to Track</h3>
                <p>You need to claim a character before setting goals.</p>
              </div>
            ) : (
              <div className="character-goals-list">
                {userClaims.map((claim) => (
                  <div className="character-goal-card" key={`goal-card-${claim.id}`}>
                    <div className="character-goal-header">
                      <div className="character-goal-name">{claim.members.name}</div>
                      <div className="character-goal-stats">
                        <div className="mini-stat">
                          <span className="mini-stat-value">{claim.members.current_lvl || 3}</span>
                          <span className="mini-stat-label">Combat</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-stat-value">{claim.members.ehb || 0}</span>
                          <span className="mini-stat-label">EHB</span>
                        </div>
                      </div>
                    </div>
        
                    {activePlayer?.wom_id === claim.members.wom_id ? (
                      <div className="character-goal-content">
                        <GoalsList
                          player={claim.members}
                          userId={user.id}
                          onClose={() => setActivePlayer(null)}
                        />
                      </div>
                    ) : (
                      <>
                        <PlayerGoalSummary 
                          playerId={claim.members.wom_id}
                          userId={user.id}
                        />
                        <div className="character-goal-actions">
                          <button
                            className="action-button primary"
                            onClick={() => setActivePlayer(claim.members)}
                          >
                            Manage Goals
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Character Claims</h2>
            </div>

            <div className="claim-player-section">
              <ClaimPlayer onRequestSubmitted={fetchUserRequests} />
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Account Management</h2>
            </div>

            <div className="account-details">
              <div className="account-field">
                <label>Username</label>
                <div className="field-value">{user.username}</div>
              </div>
              <div className="account-field">
                <label>Member Since</label>
                <div className="field-value">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="account-field">
                <label>Email Address</label>
                <div className="field-value">
                  {user.email || "Coming Soon"}
                </div>
              </div>
              
              <div className="account-field">
                <label>Discord Name</label>
                <div className="field-value">
                  {"Coming Soon"}
                </div>
              </div>

              <div className="account-actions">
                <button className="action-button secondary" disabled>
                  Change Password (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
