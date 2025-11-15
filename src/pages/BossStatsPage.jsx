import React, { useState, useMemo } from "react";
import { useGroupBossStats } from "../hooks/useGroupStats";
import { FaExclamationTriangle } from "react-icons/fa";
import MetricIcon from "../components/MetricIcon";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Card from "../components/ui/Card";
import "./BossStatsPage.css";

export default function BossStatsPage() {
  const [viewMode, setViewMode] = useState("bosses");
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useGroupBossStats();

  // Filter based on search term
  const filteredData = useMemo(() => {
    if (!data) return { bosses: [], activities: [] };
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase().trim();

    const filteredBosses = (data.bosses || []).filter(
      (boss) =>
        (boss.displayName && boss.displayName.toLowerCase().includes(term)) ||
        (boss.player && boss.player.displayName &&
         boss.player.displayName.toLowerCase().includes(term))
    );

    const filteredActivities = (data.activities || []).filter(
      (activity) =>
        (activity.displayName && activity.displayName.toLowerCase().includes(term)) ||
        (activity.player && activity.player.displayName &&
         activity.player.displayName.toLowerCase().includes(term))
    );

    return {
      bosses: filteredBosses,
      activities: filteredActivities
    };
  }, [data, searchTerm]);

  return (
    <div className="ui-page-container">
      {isLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading clan stats...</div>
        </div>
      )}

      {error && (
        <Card className="ui-section-container ui-message-card">
          <Card.Body className="ui-centered-message">
            <div className="ui-message-icon-large">
              <FaExclamationTriangle className="ui-warning-icon" />
            </div>
            <h3>Unable to Load Clan Stats</h3>
            <p>We're having trouble connecting to the stats service right now. Please try again later.</p>
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()} 
              className="ui-retry-button"
            >
              Try Again
            </Button>
          </Card.Body>
        </Card>
      )}

      <div className="ui-content-header">
        <h2>
          Clan {viewMode === "bosses" ? "Boss Kills" : "Activities"}
        </h2>
        <div className="ui-actions-container">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Search bosses or players..."
          />
          <Button 
            variant="secondary" 
            onClick={() => setViewMode(viewMode === "bosses" ? "activities" : "bosses")}
          >
            Show {viewMode === "bosses" ? "Activities" : "Boss Kills"}
          </Button>
        </div>
      </div>

      {!isLoading && filteredData && (
        <div className="ui-section-container">
          {viewMode === "bosses" ? (
            // Bosses Table
            filteredData.bosses && filteredData.bosses.length > 0 ? (
              <div className="boss-stats-wrapper">
                <div className="boss-table-container">
                  <table className="boss-table">
                    <thead>
                      <tr>
                        <th>Boss</th>
                        <th>Player</th>
                        <th>Kill Count</th>
                        <th>Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.bosses.map((boss, index) => (
                        <tr key={index} className="boss-stats-row">
                          <td className="boss-name">
                            <span className="boss-icon">
                              <MetricIcon metric={boss.metric || boss.displayName} />
                            </span>
                            {boss.displayName}
                          </td>
                          <td className="boss-player-name">
                            {boss.player ? boss.player.displayName : "N/A"}
                          </td>
                          <td className="boss-kills">
                            {boss.kills.toLocaleString()}
                          </td>
                          <td className="boss-rank">
                            {boss.rank.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="boss-empty-message">
                <p>No boss kills found{searchTerm ? " matching your search" : ""}</p>
              </div>
            )
          ) : (
            // Activities Table
            filteredData.activities && filteredData.activities.length > 0 ? (
              <div className="boss-stats-wrapper">
                <div className="boss-table-container">
                  <table className="boss-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.activities.map((activity, index) => (
                        <tr key={index} className="boss-stats-row">
                          <td className="boss-activity-name">
                            <span className="boss-activity-icon">
                              <MetricIcon metric={activity.metric || activity.displayName} />
                            </span>
                            {activity.displayName}
                          </td>
                          <td className="boss-player-name">
                            {activity.player ? activity.player.displayName : "N/A"}
                          </td>
                          <td className="boss-activity-score">
                            {activity.score.toLocaleString()}
                          </td>
                          <td className="boss-activity-rank">
                            {activity.rank.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="boss-empty-message">
                <p>No activities found{searchTerm ? " matching your search" : ""}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
