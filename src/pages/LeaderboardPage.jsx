import React, { useState } from "react";
import Leaderboard from "../components/Leaderboard";
import { useMembers } from "../hooks/useMembers";
import { useEvents } from "../hooks/useEvents";
import { FaTrophy, FaTimes, FaMedal } from "react-icons/fa";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

import "./LeaderboardPage.css";

export default function LeaderboardPage() {
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers();
  const { events, loading: eventsLoading } = useEvents();
  const [showFullScoreLeaderboard, setShowFullScoreLeaderboard] = useState(false);
  const [showFullWinsLeaderboard, setShowFullWinsLeaderboard] = useState(false);

  // Determine if there are enough players for "show more" buttons
  const hasEnoughScorePlayers = members && 
    members.filter(m => (parseInt(m.siege_score) || 0) > 0).length > 10;
  
  // Calculate number of event winners
  const eventWinnerCount = events ? 
    new Set(events.filter(e => e.winner_username).map(e => e.winner_username.toLowerCase())).size : 0;
  
  const hasEnoughWinners = eventWinnerCount > 10;

  return (
    <div className="ui-page-container">
      {(membersLoading || eventsLoading) && (
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
        <h2>Clan Leaderboards</h2>
      </div>
      
      {/* Side-by-side container for the leaderboards */}
      <div className="ui-leaderboards-container">
        {/* Points Leaderboard Section */}
        <div className="ui-section-container">
          <h3 className="ui-section-title">
            <FaTrophy className="ui-section-icon" /> Siege Score Leaderboard
          </h3>
          
          <Leaderboard
            members={members || []}
            showTitle={false}
            limit={showFullScoreLeaderboard ? null : 10}
            loading={membersLoading}
          />

          {/* Toggle button for siege score leaderboard */}
          {hasEnoughScorePlayers && (
            <div className="ui-button-center">
              <Button
                variant="secondary"
                onClick={() => setShowFullScoreLeaderboard(!showFullScoreLeaderboard)}
              >
                {showFullScoreLeaderboard
                  ? "Show Less"
                  : "Show Full Leaderboard"}
              </Button>
            </div>
          )}
        </div>

        {/* Event Wins Leaderboard Section */}
        <div className="ui-section-container">
          <h3 className="ui-section-title">
            <FaMedal className="ui-section-icon" /> Event Wins Leaderboard
          </h3>
          
          <Leaderboard
            members={members || []}
            events={events || []}
            showTitle={false}
            limit={showFullWinsLeaderboard ? null : 10}
            loading={membersLoading || eventsLoading}
            type="wins"
          />

          {/* Toggle button for event wins leaderboard */}
          {hasEnoughWinners && (
            <div className="ui-button-center">
              <Button
                variant="secondary"
                onClick={() => setShowFullWinsLeaderboard(!showFullWinsLeaderboard)}
              >
                {showFullWinsLeaderboard
                  ? "Show Less"
                  : "Show Full Leaderboard"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Explanation Card */}
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
  );
}
