import React, { useMemo } from "react";
import { FaCrown, FaMedal } from "react-icons/fa";
import { titleize } from "../utils/stringUtils";
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
      <div className={`ui-leaderboard-compact ${className}`}>
        {leaderboardData.length === 0 ? (
          <div className="ui-empty-message">No players with siege scores</div>
        ) : (
          leaderboardData.map((player, index) => (
            <div key={player.wom_id || index} className="ui-mini-player">
              <span className={`ui-rank-badge ui-rank-${index + 1}`}>
                {index === 0 ? (
                  <FaCrown className="ui-gold-icon" />
                ) : index === 1 ? (
                  <FaMedal className="ui-silver-icon" />
                ) : index === 2 ? (
                  <FaMedal className="ui-bronze-icon" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="ui-player-name">{titleize(player.name) || titleize(player.wom_name) || "Unknown"}</span>
              <span className="ui-player-score">{player.siege_score.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={`ui-leaderboard ${className}`}>
      {showTitle && <h2 className="ui-leaderboard-title">Siege Score Leaderboard</h2>}
      
      <div className="ui-table-container">
        <table className="ui-table">
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
                <td colSpan="3" className="ui-empty-cell">No players with siege scores found</td>
              </tr>
            ) : (
              leaderboardData.map((player, index) => (
                <tr key={player.wom_id || index} className={index < 3 ? `ui-top-${index + 1}` : ""}>
                  <td>
                    {index === 0 ? (
                      <FaCrown className="ui-gold-icon" title="1st Place" />
                    ) : index === 1 ? (
                      <FaMedal className="ui-silver-icon" title="2nd Place" />
                    ) : index === 2 ? (
                      <FaMedal className="ui-bronze-icon" title="3rd Place" />
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td>{titleize(player.name) || titleize(player.wom_name) || "Unknown"}</td>
                  <td className="ui-player-score">{player.siege_score.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
