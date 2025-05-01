import React, { useState } from "react";
import Leaderboard from "../components/Leaderboard";
import { useMembers } from "../hooks/useMembers";
import { FaTrophy, FaTimes } from "react-icons/fa";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

import "./LeaderboardPage.css";

export default function LeaderboardPage() {
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers();
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

  return (
    <div className="ui-page-container">
      {membersLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading leaderboard data...</div>
        </div>
      )}

      {membersError && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Data</h3>
            <p>{membersError.message || "Failed to load data"}</p>
            <Button onClick={refreshMembers} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>Siege Score Leaderboard</h2>
      </div>
      
      <div className="ui-section-container">
        <Leaderboard
          members={members || []}
          showTitle={false}
          limit={showFullLeaderboard ? null : 10}
          loading={membersLoading}
        />

        {/* Toggle button */}
        {members &&
          members.filter((m) => (parseInt(m.siege_score) || 0) > 0).length >
            10 && (
            <div className="ui-button-center">
              <Button
                variant="secondary"
                onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
              >
                {showFullLeaderboard
                  ? "Show Less"
                  : "Show Full Leaderboard"}
              </Button>
            </div>
          )}

        <Card className="ui-leaderboard-info" variant="dark">
          <Card.Body>
            <p>
              Points are earned by participating in clan events and
              competitions:
            </p>
            <div className="ui-points-categories">
              <div className="ui-points-category ui-points-category-long">
                <h4>Long Events</h4>
                <ul>
                  <li>1st place: 15 points</li>
                  <li>2nd place: 10 points</li>
                  <li>3rd place: 5 points</li>
                  <li>Participation: 2 points</li>
                </ul>
              </div>
              <div className="ui-points-category ui-points-category-short">
                <h4>Short Events (1-2 hours)</h4>
                <ul>
                  <li>All participants: 2 points</li>
                </ul>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
