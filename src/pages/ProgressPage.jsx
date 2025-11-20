import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
// import { useRaces } from "../hooks/useRaces"; // Hidden until metrics issue resolved
import { useUserGoals } from "../hooks/useUserGoals"; // Updated hook
import { FaPlus, FaTrophy, FaBullseye } from "react-icons/fa";
// import CreateRace from "../components/CreateRace"; // Hidden until metrics issue resolved
import LoadingIndicator from "../components/ui/LoadingIndicator";
// import RaceCard from "../components/RaceCard"; // Hidden until metrics issue resolved
import GoalCard from "../components/GoalCard";
import EmptyState from "../components/ui/EmptyState";
import "./ProgressPage.css";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function ProgressPage() {
  const { user } = useAuth();

  // Set default active tab to public goals (races hidden)
  const [activeTab, setActiveTab] = useState("publicGoals");
  // const [showCreateRace, setShowCreateRace] = useState(false); // Hidden until metrics issue resolved

  /* Hidden until metrics issue resolved
  // Update active tab if auth state changes
  useEffect(() => {
    if (!user && activeTab === "myRaces") {
      setActiveTab("publicRaces");
    }
  }, [user, activeTab]);

  // Fetch races
  const {
    activeRaces,
    publicRaces,
    loading: racesLoading,
    refreshRaces,
  } = useRaces(user?.id);

  const handleCreatedRace = () => {
    setShowCreateRace(false);
    refreshRaces();
  };
  */

  // Fetch user goals
  const {
    userGoals,
    loading: goalsLoading,
    error: goalsError,
  } = useUserGoals();

  // publicGoals filtered from user goals
  const publicGoals = (userGoals || []).filter((goal) => goal.public === true);

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      /* Hidden until metrics issue resolved
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

        if (!publicRaces || publicRaces.length === 0) {
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
            {publicRaces.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                isOwner={user && race.creator_id === user.id}
              />
            ))}
          </div>
        );
      */

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

  // Create tabs array - only showing goals (races hidden)
  const tabsToDisplay = [
    /* Hidden until metrics issue resolved
    {
      id: "publicRaces",
      label: "Public Races",
      icon: <FaTrophy />,
      count: publicRaces?.length || 0,
    },
    */
    {
      id: "publicGoals",
      label: "Member Goals",
      icon: <FaBullseye />,
      count: publicGoals?.length || 0,
    },
  ];

  /* Hidden until metrics issue resolved
  if (user) {
    tabsToDisplay.unshift({
      id: "myRaces",
      label: "My Races",
      icon: <FaTrophy />,
      count: activeRaces?.length || 0,
    });
  }
  */

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
