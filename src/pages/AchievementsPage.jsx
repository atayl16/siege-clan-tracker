import React, { useState } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";
import { FaTrophy, FaTimes } from "react-icons/fa";
import Button from "../components/ui/Button";
import "./AchievementsPage.css";

export default function AchievementsPage() {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, error } = useGroupAchievements(showAll ? 100 : 10);

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
          <FaTrophy className="ui-header-icon" /> Recent Achievements
        </h2>
      </div>

      {!isLoading && data && (
        <div className="ui-section-container">
          <ul className="ui-achievements-list">
            {data.map((achievement, index) => (
              <li key={index} className="ui-achievement-item">
                <div className="ui-achievement-header">
                  <span className="ui-player-name">{achievement.player.displayName}</span>
                  <span className="ui-achievement-date">
                    {new Date(achievement.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="ui-achievement-content">
                  <span className="ui-achievement-name">{achievement.name}</span>
                  <div className="ui-achievement-details">
                    <span className="ui-achievement-metric">{achievement.metric}</span>
                    <span className="ui-achievement-measure">{achievement.measure}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
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
