import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import ClaimPlayer from "../components/ClaimPlayer";
import GoalsList from "../components/goals/GoalsList";
import PlayerGoalSummary from "../components/goals/PlayerGoalSummary";
import { updatePlayerGoals } from "../services/goalProgressService";
import { FaUser, FaFlag, FaClock, FaCog } from "react-icons/fa";
import { titleize } from "../utils/stringUtils";

// Import UI components
import Card from "../components/ui/Card";
import CardGrid from "../components/ui/CardGrid";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Tabs from "../components/ui/Tabs";
import EmptyState from "../components/ui/EmptyState";
import StatGroup from "../components/ui/StatGroup";

import "./ProfilePage.css";

// Character Goal Card component
function CharacterGoalCard({ claim, user }) {
  return (
    <Card variant="default" hover className="ui-character-card">
      <Card.Header className="ui-character-card-header">
        <div className="ui-character-name">{claim.members.name}</div>
        <Badge variant="primary" pill>
          Goals
        </Badge>
      </Card.Header>

      <Card.Body>
        <StatGroup className="ui-character-stats">
          <StatGroup.Stat
            label="Combat Level"
            value={claim.members.current_lvl || 3}
          />
          <StatGroup.Stat label="EHB" value={claim.members.ehb || 0} />
        </StatGroup>

        <div className="ui-character-goal-content">
          <GoalsList
            player={claim.members}
            userId={user.id}
            onClose={() => {}}
          />
        </div>
      </Card.Body>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, userClaims } = useAuth();
  const [userRequests, setUserRequests] = useState([]);
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
  const handleShowGoals = () => {
    setActiveTab("goals");
  };

  // Update goals effect
  useEffect(() => {
    if (user && userClaims.length > 0) {
      const updateGoals = async () => {
        try {
          for (const claim of userClaims) {
            await updatePlayerGoals(claim.members.wom_id, user.id);
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
        <div className="profile-auth-links">
          <Link to="/login" className="btn-primary">Log In</Link>
          <Link to="/register" className="btn-secondary">Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="user-summary">
          <div className="username">{titleize(user.username)}</div>
          <div className="member-since">
            Member since {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab} className="profile-tabs">
        <Tabs.Tab tabId="characters" label="Characters" icon={<FaUser />}>
          <div className="tab-header">
            <h2>Your Characters</h2>
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab("requests")}
            >
              Claim New Character
            </Button>
          </div>

          {userClaims.length === 0 ? (
            <EmptyState
              title="No Characters Yet"
              description="You haven't claimed any characters yet. Click 'Claim New Character' to get started."
            />
          ) : (
            <CardGrid>
              {userClaims.map((claim) => (
                <Card key={`claim-${claim.id}`} hover className="ui-character-card">
                  <Card.Header className="ui-character-card-header">
                    <div className="ui-character-name">{claim.members.name}</div>
                    <Badge variant="success" pill>Claimed</Badge>
                  </Card.Header>

                  <Card.Body>
                    <StatGroup className="ui-character-stats">
                      <StatGroup.Stat 
                        label="Combat Level" 
                        value={claim.members.current_lvl || 3}
                      />
                      <StatGroup.Stat 
                        label="EHB" 
                        value={claim.members.ehb || 0}
                      />
                      <StatGroup.Stat 
                        label="Siege Score" 
                        value={claim.members.siege_score || 0}
                      />
                    </StatGroup>

                    <PlayerGoalSummary
                      playerId={claim.members.wom_id}
                      userId={user.id}
                    />
                  </Card.Body>

                  <Card.Footer className="ui-character-card-footer">
                    <Button
                      variant="primary"
                      onClick={handleShowGoals}
                    >
                      Manage Goals
                    </Button>
                    <div className="ui-claim-date">
                      Claimed on{" "}
                      {new Date(claim.claimed_at).toLocaleDateString()}
                    </div>
                  </Card.Footer>
                </Card>
              ))}
            </CardGrid>
          )}
        </Tabs.Tab>

        <Tabs.Tab tabId="goals" label="Goals" icon={<FaFlag />}>
          <div className="tab-header">
            <h2>Character Goals</h2>
          </div>
      
          {userClaims.length === 0 ? (
            <EmptyState
              title="No Characters to Track"
              description="You need to claim a character before setting goals."
            />
          ) : (
            <CardGrid>
              {userClaims.map((claim) => (
                <CharacterGoalCard 
                  key={`goal-card-${claim.id}`}
                  claim={claim}
                  user={user}
                />
              ))}
            </CardGrid>
          )}
        </Tabs.Tab>

        <Tabs.Tab 
          tabId="requests" 
          label="Requests" 
          icon={<FaClock />}
          badge={userRequests.length > 0 ? userRequests.length : null}
        >
          <div className="tab-header">
            <h2>Character Claims</h2>
          </div>

          <div className="claim-player-section">
            <ClaimPlayer onRequestSubmitted={fetchUserRequests} />
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="account" label="Account" icon={<FaCog />}>
          <div className="tab-header">
            <h2>Account Management</h2>
          </div>

          <Card>
            <Card.Body>
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
                <Button variant="secondary" disabled>
                  Change Password (Coming Soon)
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
