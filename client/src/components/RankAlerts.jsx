import { useQuery } from "@tanstack/react-query";

export default function RankAlerts() {
  const { data: alerts } = useQuery({
    queryKey: ["rank-alerts"],
    queryFn: () =>
      fetch("/api/members?needs_update=true").then((res) => res.json()),
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alerts-container">
      <h3>Rank Update Required ⚠️</h3>
      <ul className="alerts-list">
        {alerts.map((member) => (
          <li key={member.wom_id} className="alert-item">
            <span className="username">{member.username}</span>
            <div className="alert-details">
              <span>
                Current:{" "}
                {member.member_type === "skiller"
                  ? member.skiller_rank
                  : member.fighter_rank}
              </span>
              <span>Calculated: {member.calculated_rank}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
