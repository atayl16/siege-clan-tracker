import React, { useEffect, useState } from "react";
import MemberTable from "../components/MemberTable";
import SiegeLeaderboard from "../components/SiegeLeaderboard";
import RankAlerts from "../components/RankAlerts";
import EventsTable from "../components/EventsTable";
import ClanRanks from "../components/ClanRanks";

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [events, setEvents] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    // Fetch members
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => setMembers(data))
      .catch((err) => console.error("Error fetching members:", err));

    // Fetch leaderboard
    fetch("/api/siege/leaderboard")
      .then((res) => res.json())
      .then((data) => setLeaderboard(data))
      .catch((err) => console.error("Error fetching leaderboard:", err));

    // Fetch events
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error fetching events:", err));
  }, []);

  return (
    <div className="page-container">
      <h1>Siege Clan Members</h1>
      <div className="content-grid">
        {/* Main Table */}
        <div className="main-content">
          <h2>Members</h2>
          <MemberTable members={members} />
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <h2>Leaderboard</h2>
          <SiegeLeaderboard leaderboard={leaderboard} />

          <h2>Rank Alerts</h2>
          <RankAlerts />

          <h2>Events</h2>
          <EventsTable events={events} />

          <h2>Clan Ranks</h2>
          <ClanRanks />
        </div>
      </div>
    </div>
  );
}
