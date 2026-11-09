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
import "./ProgressPage.css";

import Card from "../components/ui/Card";

export default function ProgressPage() {
  // The clan's board: public races and members' public goals. Your own races
  // and goals live on your profile, which is also where races are created.
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("publicRaces");

  // useRaces returns { races, loading, refresh }. This page used to read
  // activeRaces / publicRaces / refreshRaces, which the hook never had, so
  // publicRaces.filter threw and the page was a blank screen - which is why
  // the nav link was hidden. RLS (races_read) already limits `races` to
  // public races plus your own.
  const { races, loading: racesLoading } = useRaces(user?.id);
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
          <div className="ui-races-grid">
            {filteredPublicRaces.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                isOwner={canEditRace(race, user)}
              />
            ))}
          </div>
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
          <div className="ui-goals-grid">
            {publicGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isOwner={user && goal.user_id === user.id}
              />
            ))}
          </div>
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
