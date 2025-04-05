import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import MemberTable from "../components/MemberTable";
import RankAlerts from "../components/RankAlerts";
import MemberEditor from "../components/MemberEditor";
import EventProcessor from "../components/EventProcessor";
import WomSyncButton from "../components/WomSyncButton";

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMember, setSelectedMember] = useState(null);

  if (!isAuthenticated) {
    return <div className="auth-error">Not authorized</div>;
  }

  return (
    <div className="admin-container">
      <h1>Clan Administration</h1>

      <div className="admin-grid">
        {/* Left Panel */}
        <div className="management-section">
          <h2>Member Management</h2>
          <MemberTable onRowClick={(member) => setSelectedMember(member)} />

          {selectedMember && (
            <div className="edit-section">
              <MemberEditor member={selectedMember} />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="monitoring-section">
          <div className="alert-panel">
            <h3>Active Alerts</h3>
            <RankAlerts />
          </div>

          <div className="event-panel">
            <h3>WOM Event Processing</h3>
            <EventProcessor />
          </div>

          <div className="wom-sync-panel">
            <h3>Wise Old Man Sync</h3>
            <WomSyncButton />
          </div>
        </div>
      </div>
    </div>
  );
}
