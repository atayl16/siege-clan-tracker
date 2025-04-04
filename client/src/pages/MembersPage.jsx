import { useEffect } from "react";
import SiegeLeaderboard from "../components/SiegeLeaderboard";
import MemberTable from "../components/MemberTable";
import RankAlerts from "../components/RankAlerts";

export default function MembersPage() {
  // Prefetch data for smoother navigation
  useEffect(() => {
    fetch("/api/members");
    fetch("/api/siege/leaderboard");
  }, []);

  return (
    <div className="page-container">
      <h1>Siege Clan Members</h1>
      <div className="content-grid">
        <div className="main-content">
          <MemberTable readOnly={true} />
        </div>
        <div className="sidebar">
          <SiegeLeaderboard />
          <RankAlerts />
        </div>
      </div>
    </div>
  );
}
