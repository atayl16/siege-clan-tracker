import React, { useMemo } from "react";
import "./Leaderboard.css";

// Helper function to safely parse integers
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export default function SiegeLeaderboard({ 
  members = [], 
  limit = null, 
  className = "",
  showTitle = false,
  compact = false
}) {
  // Process and prepare the leaderboard data
  const leaderboardData = useMemo(() => {
    return [...members]
      .map(member => ({
        ...member,
        siege_score: safeParseInt(member.siege_score || member.score) // Handle both formats
      }))
      .filter(member => member.siege_score > 0) // Only include members with scores > 0
      .sort((a, b) => b.siege_score - a.siege_score) // Sort by score (highest first)
      .slice(0, limit || members.length); // Apply limit if provided
  }, [members, limit]);

  if (compact) {
    // Compact version for dashboard cards
    return (
      <div className={`siege-leaderboard-compact ${className}`}>
        {leaderboardData.length === 0 ? (
          <p className="empty-message">No players with siege scores</p>
        ) : (
          leaderboardData.map((player, index) => (
            <div key={player.wom_id || index} className="mini-player">
              <span className="rank-badge">{index + 1}</span>
              <span className="player-name">{player.name || player.wom_name || "Unknown"}</span>
              <span className="player-score">{player.siege_score.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    );
  }

  // Full table version
  return (
    <div className={`siege-leaderboard ${className}`}>
      {showTitle && <h2>Siege Leaderboard</h2>}
      
      <table className="table table-dark table-striped table-hover">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center">No players with siege scores found</td>
            </tr>
          ) : (
            leaderboardData.map((player, index) => (
              <tr key={player.wom_id || index} className={index < 3 ? `top-${index + 1}` : ""}>
                <td>{index + 1}</td>
                <td>{player.name || player.wom_name || "Unknown"}</td>
                <td>{player.siege_score.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
