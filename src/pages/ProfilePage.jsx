import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRaces } from "../hooks/useRaces"; // Updated hook
import ClaimPlayer from "../components/ClaimPlayer";
import GoalsList from "../components/goals/GoalsList";
import PlayerGoalSummary from "../components/goals/PlayerGoalSummary";
import { updatePlayerGoals } from "../services/goalProgressService";
import { FaUser, FaFlag, FaClock, FaCog, FaTrophy } from "react-icons/fa";
import { titleize } from "../utils/stringUtils";
import { mainFirst, mainCharacterId } from "../utils/characters";
import { supabase } from "../supabaseClient";

// Import UI components
import Card from "../components/ui/Card";
import CardGrid from "../components/ui/CardGrid";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Tabs from "../components/ui/Tabs";
import EmptyState from "../components/ui/EmptyState";
import StatGroup from "../components/ui/StatGroup";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import RaceCard from "../components/RaceCard";
import CharacterEventStandings from "../components/CharacterEventStandings";
import CreateRace from "../components/CreateRace";

import "./ProfilePage.css";
import { racesForUser, canEditRace } from "../utils/races";
import ChangeUsername from "../components/ChangeUsername";
import ChangePassword from "../components/ChangePassword";

// Character Goal Card component
function CharacterGoalCard({ claim, user }) {
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
      {/* Names the character: on the Goals tab each card was otherwise only
          an "Add New Goal" button and its goals, with nothing saying whose. */}
      <Card.Header className="ui-character-card-header">
        <div className="ui-character-name">{claim.members.name}</div>
      </Card.Header>
      <Card.Body>
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
  // userClaims and fetchUserClaims come from AuthContext, which already joins
  // get_user_claims() to the member rows and shapes each claim as
  // { ..., members: { name, current_lvl, ehb, siege_score } } - exactly what
  // this page renders. useClaimRequests() returns { claimRequests, refresh }
  // and never had a userClaims or refreshUserClaims key, so both were
  // undefined and `userClaims.length` threw before the page could paint.
  const { user, userClaims, fetchUserClaims } = useAuth();
  const [activeTab, setActiveTab] = useState("characters");
  const [showCreateRace, setShowCreateRace] = useState(false);

  // useRaces returns { races, loading, error, refresh }; the old names here
  // were undefined too. Races stay empty in practice: the page filters on
  // race.creator_id and race.participants, and the races table has neither.
  const {
    races: activeRaces,
    loading: racesLoading,
    refresh: refreshRaces,
    refreshProgress,
  } = useRaces(user?.id);
  const refreshRace = (raceId) => refreshProgress([raceId], { force: true });

  // Main character. With more than one claimed, the user picks which is their
  // main; set_main_character() marks the rest as alts (which the Members page
  // hides by default). The main is listed first and is the default character
  // elsewhere, e.g. the first participant in a new race.
  const orderedClaims = mainFirst(userClaims);
  const mainId = mainCharacterId(userClaims);
  const hasSeveralCharacters = (userClaims?.length ?? 0) > 1;
  const [settingMainId, setSettingMainId] = useState(null);
  const [mainError, setMainError] = useState(null);

  const handleMakeMain = async (womId) => {
    setSettingMainId(womId);
    setMainError(null);
    try {
      const { error } = await supabase.rpc("set_main_character", {
        p_wom_id: womId,
      });
      if (error) throw error;
      await fetchUserClaims(user.id);
    } catch (err) {
      console.error("Error setting main character:", err);
      setMainError(`Could not change your main character: ${err.message}`);
    } finally {
      setSettingMainId(null);
    }
  };

  // Handle creating a race
  const handleCreatedRace = () => {
    setShowCreateRace(false);
    refreshRaces();
  };

  // Races this user created or has a character in
  const userCharacterRaces = racesForUser(activeRaces, user, userClaims);

  // Fetch user claims when the user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserClaims(user.id);
    }
    // fetchUserClaims is redefined on every AuthProvider render, so depending
    // on it here would refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update goals effect
  useEffect(() => {
    if (user && userClaims?.length > 0) {
      const updateGoals = async () => {
        // One character's failure should not stop the others updating.
        for (const claim of userClaims) {
          try {
            await updatePlayerGoals(claim.members.wom_id, user.id);
          } catch (err) {
            console.error(`Error updating goals for ${claim.members.wom_id}:`, err);
          }
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
          <Link to="/login" className="btn-primary">
            Log In
          </Link>
          <Link to="/register" className="btn-secondary">
            Register
          </Link>
        </div>
      </div>
    );
  }

  const renderRacesTabContent = () => {
    if (racesLoading) {
      return <LoadingIndicator />;
    }

    if (showCreateRace) {
      return (
        <CreateRace
          userId={user?.id}
          onCreated={handleCreatedRace}
          onCancel={() => setShowCreateRace(false)}
        />
      );
    }

    if (!userCharacterRaces || userCharacterRaces.length === 0) {
      return (
        <div className="races-empty-container">
          <EmptyState
            icon={<FaTrophy />}
            title="No Races Yet"
            description="Your characters aren't participating in any races yet."
            action={
              <Button variant="primary" onClick={() => setShowCreateRace(true)}>
                Create a Race
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <>
        <div className="tab-header">
          <h2>Your Race Progress</h2>
          <Button variant="primary" onClick={() => setShowCreateRace(true)}>
            Create New Race
          </Button>
        </div>

        <div className="ui-races-grid profile-races">
          {userCharacterRaces.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              isOwner={canEditRace(race, user)}
              onRefresh={refreshRace}
            />
          ))}
        </div>
      </>
    );
  };

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

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        className="profile-tabs"
      >
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

          {mainError && (
            <div className="profile-main-error" role="alert">
              {mainError}
            </div>
          )}

          {!userClaims?.length ? (
            <EmptyState
              title="No Characters Yet"
              description="You haven't claimed any characters yet. Click 'Claim New Character' to get started."
              icon={<FaUser />}
            />
          ) : (
            <CardGrid>
              {/* get_user_claims rows have no id column, so key on wom_id. */}
              {orderedClaims.map((claim) => (
                <Card
                  key={`claim-${claim.wom_id}`}
                  hover
                  className="ui-character-card"
                >
                  <Card.Header className="ui-character-card-header">
                    <div className="ui-character-name">
                      {claim.members.name}
                    </div>
                    {/* Every character here is claimed, so "Claimed" said nothing.
                        A lone character is the main (mainCharacterId falls back
                        to it), so it reads Main too. */}
                    {Number(claim.members.wom_id ?? claim.wom_id) === mainId ? (
                      <Badge variant="success" pill>
                        Main
                      </Badge>
                    ) : (
                      <Badge variant="secondary" pill>
                        Alt
                      </Badge>
                    )}
                  </Card.Header>

                  <Card.Body>
                    <StatGroup className="ui-character-stats">
                      <StatGroup.Stat
                        // current_lvl is the total level (the sync stores
                        // the overall skill level there), not combat level.
                        label="Total Level"
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

                    <CharacterEventStandings womId={claim.members.wom_id} />

                    {user &&
                    user.id &&
                    claim.members &&
                    claim.members.wom_id ? (
                      <PlayerGoalSummary
                        playerId={claim.members.wom_id}
                        userId={user.id}
                      />
                    ) : (
                      <div className="inline-goals-loading">
                        Loading user data...
                      </div>
                    )}
                  </Card.Body>

                  <Card.Footer className="ui-character-card-footer">
                    <div className="ui-character-card-actions">
                    <Button variant="primary" onClick={() => setActiveTab("goals")}>
                      Manage Goals
                    </Button>
                    {hasSeveralCharacters &&
                      Number(claim.members.wom_id ?? claim.wom_id) !== mainId && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            handleMakeMain(Number(claim.members.wom_id ?? claim.wom_id))
                          }
                          disabled={settingMainId !== null}
                        >
                          {settingMainId === Number(claim.members.wom_id ?? claim.wom_id)
                            ? "Saving..."
                            : "Make Main"}
                        </Button>
                      )}
                    </div>
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
          ) : !userClaims?.length ? (
            <EmptyState
              title="No Characters to Track"
              description="You need to claim a character before setting goals."
            />
          ) : (
            <CardGrid>
              {orderedClaims.map((claim) => (
                <CharacterGoalCard
                  key={`goal-card-${claim.wom_id}`}
                  claim={claim}
                  user={user}
                />
              ))}
            </CardGrid>
          )}
        </Tabs.Tab>

        <Tabs.Tab tabId="races" label="Races" icon={<FaTrophy />}>
          <div className="player-races-section">{renderRacesTabContent()}</div>
        </Tabs.Tab>

        <Tabs.Tab tabId="requests" label="Requests" icon={<FaClock />}>
          <div className="tab-header">
            <h2>Character Claims</h2>
          </div>

          <div className="claim-player-section">
            <ClaimPlayer onRequestSubmitted={() => user?.id && fetchUserClaims(user.id)} />
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
                <ChangeUsername
                  currentUsername={user.username}
                  onRenamed={(username) => {
                    // AuthContext re-reads the user row on load, so a reload
                    // picks up the new name everywhere. Update the cached copy
                    // too, so nothing shows the old name in between.
                    try {
                      const cached = JSON.parse(localStorage.getItem("user") || "null");
                      if (cached) {
                        localStorage.setItem("user", JSON.stringify({ ...cached, username }));
                      }
                    } catch {
                      // A bad cache entry is replaced on reload anyway.
                    }
                    window.location.reload();
                  }}
                />
              </div>
              <div className="account-field">
                <label>Password</label>
                <ChangePassword />
              </div>
              <div className="account-field">
                <label>Member Since</label>
                <div className="field-value">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
