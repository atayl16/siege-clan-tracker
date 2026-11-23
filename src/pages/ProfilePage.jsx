import React, { useState, useEffect, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRaces } from "../hooks/useRaces"; // Updated hook
import { useUserGoals } from "../hooks/useUserGoals";
import ClaimPlayer from "../components/ClaimPlayer";
import GoalsList from "../components/goals/GoalsList";
import PlayerGoalSummary from "../components/goals/PlayerGoalSummary";
import { updatePlayerGoals } from "../services/goalProgressService";
import { FaUser, FaFlag, FaClock, FaCog, FaTrophy, FaMedal } from "react-icons/fa";
import ProfileAchievements from "../components/ProfileAchievements";
import { displayUsername } from "../utils/stringUtils";
import { isBuiltInAdmin } from "../utils/builtInAdmin";
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
import WeeklyXpLeaderboard, { YourWeeklyXp } from "../components/WeeklyXpLeaderboard";
import { TitleMarks } from "../components/WeeklyTitles";
import { useTitleHolders } from "../hooks/useWeeklyTitles";
import XpProgressChart from "../components/XpProgressChart";
import SiegeScoreBreakdown from "../components/SiegeScoreBreakdown";
import YourTitleRaces from "../components/YourTitleRaces";
import EventStampCard from "../components/EventStampCard";
import { useMediaQuery } from "../hooks/useMediaQuery";

import "./ProfilePage.css";
import { racesForUser, canEditRace } from "../utils/races";
import ChangeUsername from "../components/ChangeUsername";
import ChangePassword from "../components/ChangePassword";
import { formatDate } from "../utils/dates";

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

const GOAL_UPDATE_EVERY_MS = 10 * 60 * 1000;
const goalUpdateKey = (userId) => `siege:goal-progress:${userId}`;

/** True when this member's goal progress was not updated in the last 10 minutes. */
export function goalUpdateDue(userId, now = Date.now()) {
  try {
    const last = Number(localStorage.getItem(goalUpdateKey(userId)));
    return !last || now - last >= GOAL_UPDATE_EVERY_MS;
  } catch {
    return true; // storage blocked: update, as before
  }
}

function markGoalUpdate(userId) {
  try {
    localStorage.setItem(goalUpdateKey(userId), String(Date.now()));
  } catch {
    // storage blocked: the next visit updates again, as before
  }
}

// Profile tabs a link can open with ?tab=, e.g. /profile?tab=requests.
const PROFILE_TABS = ["characters", "goals", "races", "achievements", "requests", "account"];

/**
 * The built-in admin has no profile: no characters, goals or races of its
 * own, and its username and password must never change (the server refuses
 * both too). Its sessions go to the admin page instead. Checked here rather
 * than inside ProfileContent so that component's hooks always run in order.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  if (isBuiltInAdmin(user)) return <Navigate to="/admin" replace />;
  return <ProfileContent />;
}

function ProfileContent() {
  // userClaims and fetchUserClaims come from AuthContext, which already joins
  // get_user_claims() to the member rows and shapes each claim as
  // { ..., members: { name, current_lvl, ehb, siege_score } } - exactly what
  // this page renders. useClaimRequests() returns { claimRequests, refresh }
  // and never had a userClaims or refreshUserClaims key, so both were
  // undefined and `userClaims.length` threw before the page could paint.
  const { user, userClaims, fetchUserClaims } = useAuth();
  // The member's goals, loaded once for every character card. Each card used
  // to load them itself, one identical query per character.
  const { userGoals, loading: goalsLoading, refresh: refreshGoals } = useUserGoals(user?.id);
  const goalsFor = (womId) => (userGoals || []).filter((g) => g.user_id === user?.id && g.wom_id === womId);
  // ?tab=requests opens the claim form directly (the home page links there).
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    PROFILE_TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "characters"
  );
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
  // The character shown on the Characters tab: the one picked, or the main.
  const [shownCharacter, setShownCharacter] = useState(null);
  const shownClaim =
    orderedClaims.find((c) => Number(c.members?.wom_id ?? c.wom_id) === shownCharacter) ?? orderedClaims[0];
  const mainId = mainCharacterId(userClaims);
  // Titles any of the viewer's characters hold this week, for the header.
  const { byMember: titleHolders } = useTitleHolders();
  const heldTitles = [
    ...new Map(
      (userClaims || [])
        .flatMap((c) => titleHolders.get(Number(c.members?.wom_id ?? c.wom_id)) || [])
        .map((title) => [title.id, title])
    ).values(),
  ];
  const hasSeveralCharacters = (userClaims?.length ?? 0) > 1;
  const wideScreen = useMediaQuery("(min-width: 1101px)");
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

  // Bring goal progress up to date from Wise Old Man, once the goals have
  // loaded: only for characters with goals in progress, using the goals
  // already loaded, and at most every GOAL_UPDATE_EVERY_MS per member (WOM's
  // stats change slowly; revisiting the profile need not redo it).
  const goalsUpdated = useRef(false);
  useEffect(() => {
    if (!user?.id || goalsLoading || goalsUpdated.current) return;
    goalsUpdated.current = true;
    if (!goalUpdateDue(user.id)) return;

    const womIds = [...new Set(userGoals.filter((g) => g.user_id === user.id && !g.completed).map((g) => g.wom_id))];
    if (!womIds.length) return;
    markGoalUpdate(user.id);

    (async () => {
      let changed = 0;
      // One character's failure should not stop the others updating.
      for (const womId of womIds) {
        try {
          changed += (await updatePlayerGoals(womId, user.id, { goals: userGoals }))?.updated ?? 0;
        } catch (err) {
          console.error(`Error updating goals for ${womId}:`, err);
        }
      }
      if (changed) refreshGoals();
    })();
    // refreshGoals is stable (useCallback); the goals finishing loading starts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, goalsLoading]);

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
          <div className="username">
            {displayUsername(user.username)}
            <TitleMarks titles={heldTitles} />
          </div>
          {/* "Member since" lives on the Account tab; the header shows how
              the main character is doing in this week's XP race instead. */}
          <YourWeeklyXp
            character={
              orderedClaims[0]
                ? {
                    womId: orderedClaims[0].members?.wom_id ?? orderedClaims[0].wom_id,
                    name: orderedClaims[0].members?.name,
                  }
                : null
            }
          />
        </div>
      </div>

      <div className="profile-layout">
      <div className="profile-main">
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

          {userClaims?.length === 1 && (
            <p className="profile-claim-hint">
              Have more than one account? Claim each of them with Claim New Character, then choose which one is
              your Main.
            </p>
          )}

          {!userClaims?.length ? (
            <EmptyState
              title="Claim Your Characters"
              description="Claiming links your in-game characters to this account, so you can set goals, join races and follow your progress. Have alts? Claim each one. A staff member approves every claim."
              icon={<FaUser />}
              action={
                <Button variant="primary" onClick={() => setActiveTab("requests")}>
                  Claim a Character
                </Button>
              }
            />
          ) : (
            <>
              {/* One character at a time, picked here (main first), so the
                  chart and competition standings load only for the one being
                  looked at. get_user_claims rows have no id column, so key
                  on wom_id. */}
              {hasSeveralCharacters && (
                <div className="profile-character-picker" role="group" aria-label="Character">
                  {orderedClaims.map((c) => {
                    const id = Number(c.members?.wom_id ?? c.wom_id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`profile-character-chip ${id === Number(shownClaim.members?.wom_id ?? shownClaim.wom_id) ? "is-on" : ""}`}
                        aria-pressed={id === Number(shownClaim.members?.wom_id ?? shownClaim.wom_id)}
                        onClick={() => setShownCharacter(id)}
                      >
                        {c.members?.name}
                        {id === mainId && <span className="profile-character-main">Main</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {[shownClaim].map((claim) => (
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

                    <SiegeScoreBreakdown
                      key={claim.members.wom_id}
                      womId={claim.members.wom_id}
                      total={claim.members.siege_score || 0}
                    />

                    <XpProgressChart womId={claim.members.wom_id ?? claim.wom_id} />

                    <CharacterEventStandings womId={claim.members.wom_id} />

                    <PlayerGoalSummary goals={goalsFor(claim.members.wom_id)} />
                  </Card.Body>

                  <Card.Footer className="ui-character-card-footer">
                    <div className="ui-character-card-actions">
                    <Button variant="primary" onClick={() => setActiveTab("goals")}>
                      {goalsFor(claim.members.wom_id).length ? "Manage Goals" : "Set a Goal"}
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
                      {formatDate(claim.claimed_at)}
                    </div>
                  </Card.Footer>
                </Card>
              ))}
            </>
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
            // Each character's card holds its own grid of goals, so the
            // cards take a full row each rather than squeezing side by side.
            <CardGrid className="ui-card-grid-stack">
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

        {/* Mounted only while open (Tabs renders the active tab alone), so
            its Wise Old Man fetch happens only when someone opens it. */}
        <Tabs.Tab tabId="achievements" label="Achievements" icon={<FaMedal />}>
          <div className="tab-header">
            <h2>Achievements</h2>
          </div>
          {!userClaims?.length ? (
            <EmptyState
              title="No Characters to Show"
              description="Claim a character to see its milestones here."
              icon={<FaMedal />}
            />
          ) : (
            <ProfileAchievements
              characters={orderedClaims.map((claim) => {
                const womId = Number(claim.members?.wom_id ?? claim.wom_id);
                return { womId, name: claim.members?.name ?? "Unknown", isMain: womId === mainId };
              })}
            />
          )}
        </Tabs.Tab>

        {/* tabId stays "requests" so existing ?tab=requests links still work. */}
        <Tabs.Tab tabId="requests" label="Claims" icon={<FaClock />}>
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
                <ChangePassword username={user.username} />
              </div>
              <div className="account-field">
                <label>Member Since</label>
                <div className="field-value">
                  {formatDate(user.created_at)}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Tab>
      </Tabs>
      </div>

      {/* Side cards, on wide screens only: not rendered at all below
          1100px, so phones fetch nothing for them. */}
      {wideScreen && (
        <aside className="profile-sidebar" aria-label="This week">
          <WeeklyXpLeaderboard
            variant="compact"
            className="profile-xp-week"
            highlightIds={(userClaims || []).map((c) => c.members?.wom_id ?? c.wom_id)}
          />
          <YourTitleRaces
            characters={orderedClaims.map((c) => ({ womId: c.members?.wom_id ?? c.wom_id, name: c.members?.name }))}
            held={heldTitles}
          />
          <EventStampCard womIds={orderedClaims.map((c) => c.members?.wom_id ?? c.wom_id)} />
        </aside>
      )}
      </div>
    </div>
  );
}
