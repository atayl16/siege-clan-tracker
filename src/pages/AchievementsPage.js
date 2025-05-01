import React, { useState } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";

export default function AchievementsPage() {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, error } = useGroupAchievements(showAll ? 100 : 10);

  if (isLoading) return <div>Loading achievements...</div>;
  if (error) return <div>Error loading achievements.</div>;

  return (
    <div>
      <h2>Recent Group Achievements</h2>
      <ul>
        {data.map((a, index) => (
          <li key={index}>
            <strong>{a.player.displayName}</strong>: {a.name} ({a.metric},{" "}
            {a.measure})
            <br />
            Achieved on: {new Date(a.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
      {!showAll && <button onClick={() => setShowAll(true)}>Show More</button>}
    </div>
  );
}
