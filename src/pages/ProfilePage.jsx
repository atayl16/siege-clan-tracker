import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserClaimRequests } from "../context/DataContext";
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
  // Make sure we have a valid user ID before rendering goals
  if (!user || !user.id) {
    return (
      <Card variant="default" hover className="ui-character-card">
        <Card.Body>
          <div className="ui-loading-container">
            <div className="ui-loading-spinner"></div>
            <div className="ui-loading-text">Loading user data...</div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card variant="default" hover className="ui-character-card">
      {/* Card header */}
      <Card.Body>
        {/* Stats group */}
        <div className="ui-character-goal-content">
          <GoalsList
            player={claim.members}
            userId={user.id} // Make sure this is always defined
            onClose={() => {}}
          />
        </div>
      </Card.Body>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, userClaims } = useAuth();
  const [activeTab, setActiveTab] = useState("characters");
  
  // Replace direct Supabase call with context hook
  const { 
    requests: userRequests, 
    refreshRequests: fetchUserRequests 
  } = useUserClaimRequests(user?.id);

  // Use the hook's data directly - no need for useState or useEffect
  
  // Just call fetchUserRequests when needed
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
              icon={<FaUser />}
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
                  
                    {user && user.id && claim.members && claim.members.wom_id ? (
                      <PlayerGoalSummary
                        playerId={claim.members.wom_id}
                        userId={user.id}
                      />
                    ) : (
                      <div className="inline-goals-loading">Loading user data...</div>
                    )}
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
        
          {!user ? (
            <div className="ui-loading-container">
              <div className="ui-loading-spinner"></div>
              <div className="ui-loading-text">Loading user data...</div>
            </div>
          ) : userClaims.length === 0 ? (
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
