import React, { useMemo } from "react";
import { FaCrown, FaMedal } from "react-icons/fa";
import "./Leaderboard.css";

export default function SiegeLeaderboard({ 
  members = [], 
  limit = null, 
  className = "",
  showTitle = false,
  compact = false
}) {
  const leaderboardData = useMemo(() => {
    return [...members]
      .map(member => ({
        ...member,
        siege_score: parseInt(member.siege_score || member.score, 10) || 0
      }))
      .filter(member => member.siege_score > 0)
      .sort((a, b) => b.siege_score - a.siege_score)
      .slice(0, limit || members.length);
  }, [members, limit]);

  if (compact) {
    return (
      <div className={`siege-leaderboard-compact ${className}`}>
        {leaderboardData.length === 0 ? (
          <p className="empty-message">No players with siege scores</p>
        ) : (
          leaderboardData.map((player, index) => (
            <div key={player.wom_id || index} className="mini-player">
              <span className={`rank-badge rank-${index + 1}`}>
                {index === 0 ? (
                  <FaCrown className="gold-icon" />
                ) : index === 1 ? (
                  <FaMedal className="silver-icon" />
                ) : index === 2 ? (
                  <FaMedal className="bronze-icon" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="player-name">{player.name || player.wom_name || "Unknown"}</span>
              <span className="player-score">{player.siege_score.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={`siege-leaderboard ${className}`}>
      {showTitle && <h2>Siege Score Leaderboard</h2>}
      
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
                <td>
                  {index === 0 ? (
                    <FaCrown className="gold-icon" title="1st Place" />
                  ) : index === 1 ? (
                    <FaMedal className="silver-icon" title="2nd Place" />
                  ) : index === 2 ? (
                    <FaMedal className="bronze-icon" title="3rd Place" />
                  ) : (
                    index + 1
                  )}
                </td>
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
