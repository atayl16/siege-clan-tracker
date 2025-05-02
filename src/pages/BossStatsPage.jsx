import React, { useState, useMemo } from "react";
import { useGroupBossStats } from "../hooks/useGroupStats";
import { FaSkull, FaTimes } from "react-icons/fa";
import MetricIcon from "../components/MetricIcon"; // Import MetricIcon
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
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
    
    const filteredBosses = data.bosses.filter(
      (boss) =>
        (boss.displayName && boss.displayName.toLowerCase().includes(term)) ||
        (boss.player && boss.player.displayName && 
         boss.player.displayName.toLowerCase().includes(term))
    );
    
    const filteredActivities = data.activities.filter(
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
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Clan Stats</h3>
            <p>{error.message || "Failed to load stats data"}</p>
            <Button onClick={() => window.location.reload()} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>
          <FaSkull className="ui-icon-margin" /> 
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
              <div className="ui-stats-wrapper">
                <div className="ui-table-container">
                  <table className="ui-table">
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
                        <tr key={index} className="ui-stats-row">
                          <td className="ui-boss-name">
                            <span className="ui-boss-icon">
                              <MetricIcon metric={boss.metric || boss.displayName} />
                            </span>
                            {boss.displayName}
                          </td>
                          <td className="ui-player-name">
                            {boss.player ? boss.player.displayName : "N/A"}
                          </td>
                          <td className="ui-boss-kills">
                            {boss.kills.toLocaleString()}
                          </td>
                          <td className="ui-boss-rank">
                            {boss.rank.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="ui-empty-message">
                <p>No boss kills found{searchTerm ? " matching your search" : ""}</p>
              </div>
            )
          ) : (
            // Activities Table
            filteredData.activities && filteredData.activities.length > 0 ? (
              <div className="ui-stats-wrapper">
                <div className="ui-table-container">
                  <table className="ui-table">
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
                        <tr key={index} className="ui-stats-row">
                          <td className="ui-activity-name">
                            <span className="ui-activity-icon">
                              <MetricIcon metric={activity.metric || activity.displayName} />
                            </span>
                            {activity.displayName}
                          </td>
                          <td className="ui-player-name">
                            {activity.player ? activity.player.displayName : "N/A"}
                          </td>
                          <td className="ui-activity-score">
                            {activity.score.toLocaleString()}
                          </td>
                          <td className="ui-activity-rank">
                            {activity.rank.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="ui-empty-message">
                <p>No activities found{searchTerm ? " matching your search" : ""}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
