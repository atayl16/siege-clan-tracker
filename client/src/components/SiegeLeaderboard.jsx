import { useQuery } from "@tanstack/react-query";

export default function SiegeLeaderboard() {
  const { data: leaderboard } = useQuery({
    queryKey: ["siege-scores"],
    queryFn: () =>
      fetch("/api/siege/leaderboard").then((res) => res.json()),
  });

  return (
    <div className="leaderboard">
      <h2>Siege Scores</h2>
      <ol>
        {leaderboard?.map((member, index) => (
          <li key={member.wom_id}>
            <span className="rank">{index + 1}.</span>
            <span className="name">{member.username}</span>
            <span className="score">{member.siege_score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
