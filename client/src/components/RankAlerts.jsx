import { useQuery } from "@tanstack/react-query";

export default function RankAlerts() {
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ["rank-alerts"],
    queryFn: () =>
      fetch("/api/members?needs_update=true").then((res) => res.json()),
  });

  if (isLoading) return <div>Loading alerts...</div>;
  if (error) return <div>Error loading alerts: {error.message}</div>;
  if (!Array.isArray(alerts) || alerts.length === 0)
    return <div>No rank updates required.</div>;

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
