import React from "react";

export default function SiegeLeaderboard({ leaderboard }) {
  return (
    <table className="table table-dark table-hover table-responsive table-bordered">
      <thead>
        <tr>
          <th style={{ textAlign: "center" }} colSpan="3">
            🏆 &nbsp; Top 3 Leaderboard &nbsp; 🏆
          </th>
        </tr>
        <tr>
          <th style={{ textAlign: "center" }}>Rank</th>
          <th style={{ textAlign: "left" }}>Name</th>
          <th style={{ textAlign: "center" }}>Points</th>
        </tr>
      </thead>
      <tbody>
        {leaderboard.map((player, index) => (
          <tr key={player.id}>
            <td style={{ textAlign: "center" }}>{index + 1}</td>
            <td style={{ textAlign: "left" }}>{player.name}</td>
            <td style={{ textAlign: "center" }}>{player.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
