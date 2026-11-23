import React, { useState, useMemo } from "react";
import { useGroupBossStats } from "../hooks/useGroupStats";
import { FaExclamationTriangle } from "react-icons/fa";
import MetricIcon from "./MetricIcon";
import Button from "./ui/Button";
import Card from "./ui/Card";
import BoardFilters from "./BoardFilters";
import "./HallOfFame.css";

const VIEWS = [
  { value: "bosses", label: "Boss Kills" },
  { value: "activities", label: "Activities" },
];

const matches = (row, term) =>
  (row.displayName && row.displayName.toLowerCase().includes(term)) ||
  (row.player?.displayName && row.player.displayName.toLowerCase().includes(term));

/**
 * The Leaderboard's Hall of Fame tab: for each boss and activity, the clan
 * member with the highest kill count or score. Loads only when the tab is
 * opened (Tabs mounts the open tab alone).
 */
export default function HallOfFame() {
  const [viewMode, setViewMode] = useState("bosses");
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, error } = useGroupBossStats();

  const filteredData = useMemo(() => {
    if (!data) return { bosses: [], activities: [] };
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data;
    return {
      bosses: data.bosses.filter((boss) => matches(boss, term)),
      activities: data.activities.filter((activity) => matches(activity, term)),
    };
  }, [data, searchTerm]);

  return (
    <>
      {isLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading the Hall of Fame...</div>
        </div>
      )}

      {error && (
        <Card className="ui-section-container ui-message-card">
          <Card.Body className="ui-centered-message">
            <div className="ui-message-icon-large">
              <FaExclamationTriangle className="ui-warning-icon" />
            </div>
            <h3>Unable to Load the Hall of Fame</h3>
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

      {data && (
        <BoardFilters
          query={searchTerm}
          onQueryChange={setSearchTerm}
          placeholder="Search bosses or players"
          groups={[{ label: "Show", value: viewMode, onChange: setViewMode, options: VIEWS }]}
          shown={filteredData[viewMode]?.length ?? 0}
          total={data[viewMode]?.length ?? 0}
          onClear={() => setSearchTerm("")}
        />
      )}

      {!isLoading && filteredData && (
        <div className="hof-tables">
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
    </>
  );
}
