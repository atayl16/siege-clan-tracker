import React from "react";

export default function SiegeLeaderboard({ leaderboard }) {
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
        {leaderboard.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center">No leaderboard data available</td>
          </tr>
        ) : (
          leaderboard.map((player, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{player.username}</td>
              <td>{player.score.toLocaleString()}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
