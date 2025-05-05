import React, { useState, useMemo } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";
import { FaTrophy, FaTimes, FaSearch } from "react-icons/fa";
import MetricIcon from "../components/MetricIcon";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import "./AchievementsPage.css";

export default function AchievementsPage() {
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useGroupAchievements(showAll ? 100 : 10);

  // Filter achievements based on search term
  const filteredAchievements = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase().trim();
    return data.filter(
      (achievement) =>
        (achievement.name && achievement.name.toLowerCase().includes(term)) ||
        (achievement.player && achievement.player.displayName && 
         achievement.player.displayName.toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  return (
    <div className="ui-page-container">
      {isLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading achievements...</div>
        </div>
      )}

      {error && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Achievements</h3>
            <p>{error.message || "Failed to load achievements"}</p>
            <Button onClick={() => window.location.reload()} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>
         Recent Achievements
        </h2>
        <div className="ui-actions-container">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Search achievements or players..."
          />
        </div>
      </div>

      {!isLoading && filteredAchievements && (
        <div className="ui-section-container">
          {filteredAchievements.length > 0 ? (
            <div className="achievement-wrapper">
              <div className="achievement-table-container">
                <table className="achievement-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Achievement</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAchievements.map((achievement, index) => (
                      <tr key={index} className="achievement-row">
                        <td className="achievement-player-name">
                          {achievement.player.displayName}
                        </td>
                        <td className="achievement-name">
                          <span className="achievement-icon">
                            <MetricIcon metric={achievement.metric} />
                          </span>
                          {achievement.name}
                        </td>
                        <td className="achievement-date">
                          {new Date(achievement.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="achievement-empty-message">
              <p>No achievements found{searchTerm ? " matching your search" : ""}</p>
            </div>
          )}
          
          {data && data.length > 0 && (
            <div className="ui-button-center">
              <Button 
                variant="secondary" 
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : "Show More Achievements"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
