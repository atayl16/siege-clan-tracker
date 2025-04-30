import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useData, useRaces, usePublicGoals } from "../context/DataContext";
import { FaPlus, FaTrophy, FaBullseye, FaRocket, FaLock } from "react-icons/fa";
import CreateRace from "../components/CreateRace";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import RaceCard from "../components/RaceCard";
import GoalCard from "../components/GoalCard";
import EmptyState from "../components/ui/EmptyState";
import "./ProgressPage.css";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";

export default function ProgressPage() {
  const { user } = useAuth();

  // Set default active tab based on authentication status
  const [activeTab, setActiveTab] = useState(user ? "myRaces" : "publicRaces");
  const [showCreateRace, setShowCreateRace] = useState(false);

  // Update active tab if auth state changes
  useEffect(() => {
    if (!user && activeTab === "myRaces") {
      setActiveTab("publicRaces");
    }
  }, [user, activeTab]);

  // Always fetch public races regardless of user authentication
  const {
    activeRaces,
    publicRaces,
    loading: racesLoading,
    refreshRaces,
  } = useRaces(user?.id);

  // Always fetch public goals regardless of user authentication
  const {
    publicGoals,
    loading: goalsLoading,
    error: goalsError,
  } = usePublicGoals();

  // Add debug logging to see what's happening
  useEffect(() => {
    console.log("Public goals data:", publicGoals);
    console.log("Goals loading:", goalsLoading);
    console.log("Goals error:", goalsError);
  }, [publicGoals, goalsLoading, goalsError]);

  const handleCreatedRace = (race) => {
    setShowCreateRace(false);
    refreshRaces();
  };

  const filteredPublicRaces = publicRaces.filter(race => race.public === true);

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "myRaces":
        // Only require auth for My Races tab
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

        // Always show public races regardless of authentication
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
                isOwner={user && race.creator_id === user.id}
              />
            ))}
          </div>
        );

      case "publicGoals":
        if (goalsLoading) return <LoadingIndicator />;

        // Always show public goals regardless of authentication
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
    // Public tabs are always shown
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

  // Add My Races tab if user is authenticated, or at the end if not
  if (user) {
    // Insert at the beginning for authenticated users
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
          {tabsToDisplay.map(tab => (
            <button
              key={tab.id}
              className={`ui-tab ${tab.id === activeTab ? 'ui-tab-active' : ''}`}
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
