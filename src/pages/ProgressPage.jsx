import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useRaces } from "../hooks/useRaces"; // Updated hook
import { useUserGoals } from "../hooks/useUserGoals"; // Updated hook
import { useMembers } from "../hooks/useMembers";
import { canEditRace } from "../utils/races";
import { racesForUser } from "../utils/races";
import { FaPlus, FaTrophy, FaBullseye } from "react-icons/fa";
import CreateRace from "../components/CreateRace";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import RaceCard from "../components/RaceCard";
import GoalCard from "../components/GoalCard";
import EmptyState from "../components/ui/EmptyState";
import "./ProgressPage.css";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function ProgressPage() {
  const { user, userClaims } = useAuth();

  // Set default active tab based on authentication status
  const [activeTab, setActiveTab] = useState(user ? "myRaces" : "publicRaces");
  const [showCreateRace, setShowCreateRace] = useState(false);

  // Update active tab if auth state changes
  useEffect(() => {
    if (!user && activeTab === "myRaces") {
      setActiveTab("publicRaces");
    }
  }, [user, activeTab]);

  // useRaces returns { races, loading, refresh }. This page used to read
  // activeRaces / publicRaces / refreshRaces, which the hook never had, so
  // publicRaces.filter threw and the page was a blank screen - which is why
  // the nav link was hidden. RLS (races_read) already limits `races` to
  // public races plus your own.
  const { races, loading: racesLoading, refresh: refreshRaces } = useRaces(user?.id);
  const activeRaces = racesForUser(races, user, userClaims);
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

  const handleCreatedRace = () => {
    setShowCreateRace(false);
    refreshRaces();
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "myRaces":
        if (!user) {
          return (
            <EmptyState
              icon={<FaTrophy />}
              title="Sign In Required"
              description="You need to sign in to see your races"
              action={
                <Button variant="primary" href="/login">
                  Sign In
                </Button>
              }
            />
          );
        }

        if (racesLoading) return <LoadingIndicator />;

        if (showCreateRace) {
          return (
            <CreateRace
              userId={user?.id}
              onCreated={handleCreatedRace}
              onCancel={() => setShowCreateRace(false)}
            />
          );
        }

        if (!activeRaces || activeRaces.length === 0) {
          return (
            <EmptyState
              icon={<FaTrophy />}
              title="No Races Yet"
              description="Start a race to track progress against other members"
              action={
                <Button
                  variant="primary"
                  onClick={() => setShowCreateRace(true)}
                  icon={<FaPlus />}
                >
                  Create Race
                </Button>
              }
            />
          );
        }

        return (
          <>
            {user && (
              <div className="ui-page-actions">
                <Button
                  variant="primary"
                  onClick={() => setShowCreateRace(true)}
                  icon={<FaPlus />}
                >
                  Create Race
                </Button>
              </div>
            )}

            <div className="ui-races-grid">
              {activeRaces.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  isOwner={race.creator_id === user?.id}
                />
              ))}
            </div>
          </>
        );

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

  if (user) {
    tabsToDisplay.unshift({
      id: "myRaces",
      label: "My Races",
      icon: <FaTrophy />,
      count: activeRaces?.length || 0,
    });
  }

  return (
    <Card className="ui-container-content-card">
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
  );
}
