import React, { useState } from "react";
import { useAuth } from "../context/AuthContext"; // Updated import path
import { useData, useRaces } from "../context/DataContext";
import useSWR from "swr"; // Add missing import
import { FaPlus, FaTrophy, FaBullseye, FaRocket } from "react-icons/fa";
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
  const { fetchers } = useData(); // Move this up before it's used
  const {
    activeRaces,
    publicRaces,
    loading: racesLoading,
    refreshRaces,
  } = useRaces(user?.id);
  const { data: publicGoals, loading: goalsLoading } = useSWR(
    "public-goals",
    () => fetchers.supabase.publicGoals()
  );

  const [activeTab, setActiveTab] = useState("myRaces");
  const [showCreateRace, setShowCreateRace] = useState(false);

  const handleCreatedRace = (race) => {
    setShowCreateRace(false);
    refreshRaces();
  };

  // Filter out races that belong to the user for the public races tab
  const filteredPublicRaces = user?.id
    ? publicRaces.filter((race) => race.creator_id !== user.id)
    : publicRaces;

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "myRaces":
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
            <div className="ui-page-actions">
              <Button
                variant="primary"
                onClick={() => setShowCreateRace(true)}
                icon={<FaPlus />}
              >
                Create Race
              </Button>
            </div>

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
              description="No other members have created public races yet"
            />
          );
        }

        return (
          <div className="ui-races-grid">
            {filteredPublicRaces.map((race) => (
              <RaceCard key={race.id} race={race} isOwner={false} />
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
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ui-page-container">
      <h1 className="ui-page-title">Progress Tracking</h1>

      <Card className="ui-content-card">
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            {
              id: "myRaces",
              label: "My Races",
              icon: <FaTrophy />,
              count: activeRaces?.length || 0,
            },
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
          ]}
        />

        <div className="ui-tab-content">{renderTabContent()}</div>
      </Card>
    </div>
  );
}
