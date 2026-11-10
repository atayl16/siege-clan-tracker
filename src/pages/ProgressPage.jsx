import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useRaces } from "../hooks/useRaces"; // Updated hook
import { useUserGoals } from "../hooks/useUserGoals"; // Updated hook
import { useMembers } from "../hooks/useMembers";
import { canEditRace } from "../utils/races";
import { FaTrophy, FaBullseye } from "react-icons/fa";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import RaceCard from "../components/RaceCard";
import GoalCard from "../components/GoalCard";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import BoardFilters from "../components/BoardFilters";
import { filterGoals, filterRaces, sortGoals } from "../utils/boardFilters";
import "./ProgressPage.css";

import Card from "../components/ui/Card";

export default function ProgressPage() {
  // The clan's board: public races and members' public goals. Your own races
  // and goals live on your profile, which is also where races are created.
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("publicRaces");

  // RLS (races_read) limits `races` to public races plus your own; the board
  // shows only the public ones.
  const { races, loading: racesLoading, refreshProgress } = useRaces(user?.id);
  // The Refresh button asks WiseOldMan for fresh hiscores, which needs a
  // signed-in member; visitors still get the automatic refresh on open.
  const refreshRace = user ? (raceId) => refreshProgress([raceId], { force: true }) : undefined;
  const filteredPublicRaces = (races ?? []).filter((race) => race.public === true);

  // Without a user id, RLS returns your own goals plus everyone's public ones;
  // the hook's publicGoals keeps only the public ones.
  const { publicGoals: goals, loading: goalsLoading } = useUserGoals();

  // user_goals has no player name, and GoalCard shows goal.player_name, so
  // look the character up by wom_id.
  const { members } = useMembers();
  const publicGoals = useMemo(() => {
    const nameById = new Map((members ?? []).map((m) => [Number(m.wom_id), m.name]));
    return (goals ?? []).map((goal) => ({
      ...goal,
      player_name: goal.player_name ?? nameById.get(Number(goal.wom_id)),
    }));
  }, [goals, members]);

  // Search and filters, per tab. Everything is already loaded, so they
  // filter in the browser.
  const [raceQuery, setRaceQuery] = useState("");
  const [raceStatus, setRaceStatus] = useState("all");
  const [goalQuery, setGoalQuery] = useState("");
  const [goalType, setGoalType] = useState("all");
  const [goalStatus, setGoalStatus] = useState("all");
  const [goalSort, setGoalSort] = useState("progress");

  const shownRaces = useMemo(
    () => filterRaces(filteredPublicRaces, { query: raceQuery, status: raceStatus }),
    [filteredPublicRaces, raceQuery, raceStatus]
  );
  const shownGoals = useMemo(
    () => sortGoals(filterGoals(publicGoals, { query: goalQuery, type: goalType, status: goalStatus }), goalSort),
    [publicGoals, goalQuery, goalType, goalStatus, goalSort]
  );

  const clearRaceFilters = () => {
    setRaceQuery("");
    setRaceStatus("all");
  };
  const clearGoalFilters = () => {
    setGoalQuery("");
    setGoalType("all");
    setGoalStatus("all");
  };

  const noMatches = (what, onClear) => (
    <EmptyState
      title={`No ${what} match`}
      description="Try a different search or filter."
      action={
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "publicRaces":
        if (racesLoading) return <LoadingIndicator />;

        if (!filteredPublicRaces || filteredPublicRaces.length === 0) {
          return (
            <EmptyState
              icon={<FaTrophy />}
              title="No Public Races"
              description="No public races have been created yet"
            />
          );
        }

        return (
          <>
            <BoardFilters
              query={raceQuery}
              onQueryChange={setRaceQuery}
              placeholder="Search races or racers"
              groups={[
                {
                  label: "Race status",
                  value: raceStatus,
                  onChange: setRaceStatus,
                  options: [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "finished", label: "Finished" },
                  ],
                },
              ]}
              shown={shownRaces.length}
              total={filteredPublicRaces.length}
              onClear={clearRaceFilters}
            />
            {shownRaces.length === 0 ? (
              noMatches("races", clearRaceFilters)
            ) : (
              <div className="ui-races-grid">
                {shownRaces.map((race) => (
                  <RaceCard
                    key={race.id}
                    race={race}
                    isOwner={canEditRace(race, user)}
                    onRefresh={refreshRace}
                  />
                ))}
              </div>
            )}
          </>
        );

      case "publicGoals":
        if (goalsLoading) return <LoadingIndicator />;

        if (!publicGoals || publicGoals.length === 0) {
          return (
            <EmptyState
              icon={<FaBullseye />}
              title="No Public Goals"
              description="No members have shared their goals yet"
            />
          );
        }

        return (
          <>
            <BoardFilters
              query={goalQuery}
              onQueryChange={setGoalQuery}
              placeholder="Search characters, skills or bosses"
              groups={[
                {
                  label: "Goal type",
                  value: goalType,
                  onChange: setGoalType,
                  options: [
                    { value: "all", label: "All" },
                    { value: "skill", label: "Skills" },
                    { value: "boss", label: "Bosses" },
                  ],
                },
                {
                  label: "Goal status",
                  value: goalStatus,
                  onChange: setGoalStatus,
                  options: [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                  ],
                },
              ]}
              sort={{
                value: goalSort,
                onChange: setGoalSort,
                options: [
                  { value: "progress", label: "Closest to done" },
                  { value: "newest", label: "Newest" },
                  { value: "deadline", label: "Deadline" },
                ],
              }}
              shown={shownGoals.length}
              total={publicGoals.length}
              onClear={clearGoalFilters}
            />
            {shownGoals.length === 0 ? (
              noMatches("goals", clearGoalFilters)
            ) : (
              <div className="ui-goals-grid">
                {shownGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isOwner={user && goal.user_id === user.id}
                  />
                ))}
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  // Create tabs array based on authentication status
  const tabsToDisplay = [
    {
      id: "publicRaces",
      label: "Public Races",
      icon: <FaTrophy />,
      count: filteredPublicRaces?.length || 0,
    },
    {
      id: "publicGoals",
      label: "Member Goals",
      icon: <FaBullseye />,
      count: publicGoals?.length || 0,
    },
  ];


  return (
    // The standard page container and title, like every other page: this page
    // used its card as the whole page, so it had no title and sat wider.
    <div className="ui-page-container">
      <div className="ui-content-header">
        <h2>Races &amp; Goals</h2>
      </div>
    <Card className="ui-container-content-card ui-progress-card">
      <div className="ui-tabs-container">
        <div className="ui-tabs-nav">
          {tabsToDisplay.map((tab) => (
            <button
              key={tab.id}
              className={`ui-tab ${tab.id === activeTab ? "ui-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon && <span className="ui-tab-icon">{tab.icon}</span>}
              <span className="ui-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ui-tab-content">{renderTabContent()}</div>
    </Card>
    </div>
  );
}
