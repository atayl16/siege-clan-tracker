import React, { useState } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";
import "./AchievementsPage.css";

export default function AchievementsPage() {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, error } = useGroupAchievements(showAll ? 100 : 10);

  if (isLoading) return <div className="loading">Loading achievements...</div>;
  if (error) return <div className="error">Error loading achievements.</div>;

  return (
    <div className="achievements-page">
      <h2>Recent Group Achievements</h2>
      <ul className="achievements-list">
        {data.map((a, index) => (
          <li key={index} className="achievement-item">
            <strong>{a.player.displayName}</strong>: {a.name} ({a.metric},{" "}
            {a.measure})
            <br />
            <span className="achievement-date">
              Achieved on: {new Date(a.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
      {!showAll && (
        <button className="show-more-button" onClick={() => setShowAll(true)}>
          Show More
        </button>
      )}
    </div>
  );
}
