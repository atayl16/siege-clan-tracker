import React, { useMemo } from "react";
import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";
import { titleize } from "../utils/stringUtils";
import "./Leaderboard.css";

export default function SiegeLeaderboard({ 
  members = [], 
  limit = null, 
  className = "",
  showTitle = false,
  compact = false,
  loading = false,
  type = "score", // New prop to determine leaderboard type: "score" or "wins"
  title = null,   // Custom title prop
  events = []     // Events data for wins leaderboard
}) {
  const leaderboardData = useMemo(() => {
    if (type === "score") {
      // Original siege score leaderboard logic
      return [...members]
        .map(member => ({
          ...member,
          siege_score: parseInt(member.siege_score || member.score, 10) || 0
        }))
        .filter(member => member.siege_score > 0)
        .sort((a, b) => b.siege_score - a.siege_score)
        .slice(0, limit || members.length);
    } else if (type === "wins") {
      // Event wins leaderboard logic
      // Count wins by player
      const winCounts = {};
      
      // Process all completed events with winners
      (events || [])
        .filter(event => event.winner_username)
        .forEach(event => {
          const winnerName = event.winner_username.toLowerCase();
          winCounts[winnerName] = (winCounts[winnerName] || 0) + 1;
        });
      
      // Convert to array and sort by win count
      const sortedWinners = Object.entries(winCounts)
        .map(([name, wins]) => {
          // Try to find player in members list to get additional data
          const memberInfo = members.find(m => 
            (m.name && m.name.toLowerCase() === name.toLowerCase()) || 
            (m.wom_name && m.wom_name.toLowerCase() === name.toLowerCase())
          ) || {};
          
          return {
            name: name,
            wom_name: memberInfo.wom_name || name,
            wom_id: memberInfo.wom_id,
            event_wins: wins
          };
        })
        .sort((a, b) => b.event_wins - a.event_wins)
        .slice(0, limit || Infinity);
      
      return sortedWinners;
    }
    
    return [];
  }, [members, limit, type, events]);

  // Get the appropriate title
  const displayTitle = title || (type === "score" ? "Siege Score Leaderboard" : "Event Wins Leaderboard");

  // Show loading state
  if (loading) {
    return (
      <div className={`ui-leaderboard ${className} ${compact ? 'ui-leaderboard-compact' : ''}`}>
        {showTitle && <h2 className="ui-leaderboard-title">{displayTitle}</h2>}
        <div className="ui-loading-indicator">Loading leaderboard data...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`ui-leaderboard-compact ${className}`}>
        {showTitle && <h3 className="ui-leaderboard-title">{displayTitle}</h3>}
        
        {leaderboardData.length === 0 ? (
          <div className="ui-empty-message">
            {type === "score" ? "No players with siege scores" : "No event winners yet"}
          </div>
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
              <span className="ui-player-score">
                {type === "score" 
                  ? `${player.siege_score.toLocaleString()} pts` 
                  : `${player.event_wins} ${player.event_wins === 1 ? "win" : "wins"}`}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={`ui-leaderboard ${className}`}>
      {showTitle && <h2 className="ui-leaderboard-title">{displayTitle}</h2>}
      
      <div className="ui-table-container">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>{type === "score" ? "Score" : "Event Wins"}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.length === 0 ? (
              <tr>
                <td colSpan="3" className="ui-empty-cell">
                  {type === "score" 
                    ? "No players with siege scores found" 
                    : "No event winners found"}
                </td>
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
                  <td className="ui-player-score">
                    {type === "score" 
                      ? player.siege_score.toLocaleString()
                      : player.event_wins}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
