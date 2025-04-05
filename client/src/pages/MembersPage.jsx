import React, { useEffect, useState, useMemo } from "react";
import MemberTable from "../components/MemberTable";
import SiegeLeaderboard from "../components/SiegeLeaderboard";
import EventsTable from "../components/EventsTable";
import ClanRanks from "../components/ClanRanks";
import "./MembersPage.css"; // Import the CSS file for styling

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Generate the leaderboard from members data, sorted by siege_score
  const leaderboard = useMemo(() => {
    // Return top 5 members sorted by siege_score (highest first)
    return [...members]
      .sort((a, b) => (b.siege_score || 0) - (a.siege_score || 0))
      .slice(0, 5) // Get only the top 5 players
      .map(member => ({
        name: member.name,
        score: member.siege_score || 0
      }));
  }, [members]);

  // Fetch data on component mount
  useEffect(() => {
    setLoading(true);
    
    // Fetch members
    fetch("/api/members")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMembers(data);
        // No need for separate leaderboard fetch since we derive it from members
      })
      .catch((err) => {
        console.error("Error fetching members:", err);
        setError(err.message);
      });

    // Fetch events
    fetch("/api/events")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        return res.json();
      })
      .then((data) => setEvents(data))
      .catch((err) => {
        console.error("Error fetching events:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-container" style={{ backgroundColor: "black" }}>
      <h1 className="page-title">XP Tracker</h1>
      
      {loading && <div className="alert alert-info">Loading data...</div>}
      {error && <div className="alert alert-danger">Error: {error}</div>}
      
      <div className="row">
        {/* Main Table - Takes up 65% on medium+ screens, full width on smaller screens */}
        <div className="col-12 col-md-7 mb-4">
          <h2 className="section-title">Members</h2>
          <div className="table-responsive">
            <MemberTable members={members} />
          </div>
        </div>
  
        {/* Sidebar - Takes up 35% on medium+ screens, full width on smaller screens */}
        <div className="col-12 col-md-5">
          <div className="sidebar-content">
            <div className="mb-4">
              <h2 className="section-title">Leaderboard</h2>
              <div className="table-responsive">
                <SiegeLeaderboard leaderboard={leaderboard} />
              </div>
            </div>
  
            <div className="mb-4">
              <h2 className="section-title">Events</h2>
              <div className="table-responsive">
                <EventsTable events={events} />
              </div>
            </div>
  
            <div className="mb-4">
              <h2 className="section-title">Clan Ranks</h2>
              <ClanRanks />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
