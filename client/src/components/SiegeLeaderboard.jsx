import React from "react";

// Helper function to safely parse integers
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export default function SiegeLeaderboard({ leaderboard = [] }) {
  // Sort the leaderboard by siege_score in descending order
  const sortedLeaderboard = React.useMemo(() => {
    return [...leaderboard]
      .map(player => ({
        ...player,
        siege_score: safeParseInt(player.siege_score) // Ensure numeric values
      }))
      .filter(player => player.siege_score > 0) // Only include players with scores > 0
      .sort((a, b) => b.siege_score - a.siege_score); // Sort by score (highest first)
  }, [leaderboard]);

  return (
    <table className="table table-dark table-striped table-hover">
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Player</th>
          <th scope="col">Score</th>
        </tr>
      </thead>
      <tbody>
        {sortedLeaderboard.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center">No players with siege scores found</td>
          </tr>
        ) : (
          sortedLeaderboard.map((player, index) => (
            <tr key={player.wom_id || index}>
              <td>{index + 1}</td>
              <td>{player.name || player.wom_name || "Unknown"}</td>
              <td>{player.siege_score.toLocaleString()}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
