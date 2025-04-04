import React from "react";

export default function ClanRanks() {
  const ranks = [
    { name: "Opal", color: "moccasin", description: "New Member" },
    { name: "Sapphire", color: "blue", description: "3,000,000 XP" },
    { name: "Emerald", color: "lime", description: "8,000,000 XP" },
    { name: "Ruby", color: "red", description: "15,000,000 XP" },
    { name: "Diamond", color: "white", description: "40,000,000 XP" },
    { name: "Dragonstone", color: "magenta", description: "90,000,000 XP" },
    { name: "Onyx", color: "grey", description: "150,000,000 XP" },
    { name: "Zenyte", color: "orange", description: "500,000,000 XP" },
  ];

  return (
    <table className="table table-dark table-hover table-sm table-responsive">
      <thead>
        <tr>
          <th style={{ textAlign: "center" }} colSpan="2">
            Clan Ranks
          </th>
        </tr>
      </thead>
      <tbody>
        {ranks.map((rank) => (
          <tr key={rank.name}>
            <td style={{ textAlign: "center" }}>
              <i
                className="bi-gem"
                style={{ fontSize: "1rem", color: rank.color }}
              >
                {" "}
                {rank.name} - {rank.description}
              </i>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
