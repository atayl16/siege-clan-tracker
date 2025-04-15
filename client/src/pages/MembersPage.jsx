import React, { useEffect, useState, useMemo } from "react";
import { Tab, Nav, Form, InputGroup } from "react-bootstrap";
import MemberTable from "../components/MemberTable";
import SiegeLeaderboard from "../components/SiegeLeaderboard";
import EventsTable from "../components/EventsTable";
import ClanRanks from "../components/ClanRanks";
import { FaSearch, FaTrophy, FaCalendarAlt, FaUsers, FaMedal } from "react-icons/fa";
import "./MembersPage.css";

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeKey, setActiveKey] = useState("members");
  
  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  // Generate leaderboard from members data
  const leaderboard = useMemo(() => {
    return [...members]
      .sort((a, b) => (b.siege_score || 0) - (a.siege_score || 0))
      .slice(0, 5)
      .map(member => ({
        name: member.name,
        score: member.siege_score || 0
      }));
  }, [members]);

  // Fetch data on component mount
  useEffect(() => {
    setLoading(true);
    
    Promise.all([
      fetch("/api/members").then(res => {
        if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
        return res.json();
      }),
      fetch("/api/events").then(res => {
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        return res.json();
      })
    ])
    .then(([membersData, eventsData]) => {
      setMembers(membersData);
      setEvents(eventsData);
    })
    .catch(err => {
      console.error("Error fetching data:", err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div className="siege-dashboard">
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading clan data...</div>
        </div>
      )}

      {error && (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="refresh-button"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Quick glance cards for most important information */}
      <div className="quick-stats">
        <div className="stat-card">
          <h3>Clan Stats</h3>
          <div className="card-content stats-list">
            <div className="stat-item">
              <div className="stat-label">Members</div>
              <div className="stat-value">{members.length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total XP</div>
              <div className="stat-value">
                {Math.floor(
                  members.reduce(
                    (sum, m) => sum + (parseInt(m.current_xp) || 0),
                    0
                  ) / 1000000
                )}
                M
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Avg. Level</div>
              <div className="stat-value">
                {Math.floor(
                  members.reduce(
                    (sum, m) => sum + (parseInt(m.current_lvl) || 0),
                    0
                  ) / Math.max(1, members.length)
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <h3>Active Events</h3>
          <div className="card-content">
            {events.filter(
              (e) =>
                new Date(e.start_date) <= new Date() &&
                new Date(e.end_date) >= new Date()
            ).length === 0 ? (
              <p>No active events</p>
            ) : (
              events
                .filter(
                  (e) =>
                    new Date(e.start_date) <= new Date() &&
                    new Date(e.end_date) >= new Date()
                )
                .slice(0, 2)
                .map((event) => (
                  <div key={event.id} className="mini-event">
                    <strong>{event.name}</strong>
                    <span className="badge bg-warning text-dark">
                      Ends {new Date(event.end_date).toLocaleDateString()}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="stat-card">
          <h3>Leaderboard</h3>
          <div className="card-content">
            {leaderboard.slice(0, 3).map((player, index) => (
              <div key={index} className="mini-player">
                <span className="rank-badge">{index + 1}</span>
                <span className="player-name">{player.name}</span>
                <span className="player-score">{player.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content with tabs */}
      <Tab.Container
        activeKey={activeKey}
        onSelect={(k) => setActiveKey(k)}
        transition={true}
      >
        <div className="dashboard-container">
          {/* Tab navigation */}
          <Nav variant="pills" className="dashboard-nav">
            <Nav.Item>
              <Nav.Link eventKey="members">
                <FaUsers /> Members{" "}
                <span className="badge bg-secondary">{members.length}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="events">
                <FaCalendarAlt /> Events{" "}
                <span className="badge bg-info">{events.length}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="leaderboard">
                <FaTrophy /> Leaderboard
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="ranks">
                <FaMedal /> Clan Ranks
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Tab content */}
          <Tab.Content className="dashboard-content">
            {/* Members Tab */}
            <Tab.Pane eventKey="members">
              <div className="content-header">
                <h2>Clan Members</h2>
                <InputGroup className="member-search">
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
              <div className="member-table-container table-responsive">
                <MemberTable members={filteredMembers} />
              </div>
            </Tab.Pane>

            {/* Events Tab */}
            <Tab.Pane eventKey="events">
              <div className="content-header">
                <h2>Clan Events</h2>
              </div>

              <div className="events-summary">
                <div className="event-stat">
                  <span className="event-stat-value">
                    {
                      events.filter(
                        (e) =>
                          new Date(e.start_date) <= new Date() &&
                          new Date(e.end_date) >= new Date()
                      ).length
                    }
                  </span>
                  <span className="event-stat-label">Active</span>
                </div>
                <div className="event-stat">
                  <span className="event-stat-value">
                    {
                      events.filter((e) => new Date(e.start_date) > new Date())
                        .length
                    }
                  </span>
                  <span className="event-stat-label">Upcoming</span>
                </div>
                <div className="event-stat">
                  <span className="event-stat-value">
                    {
                      events.filter((e) => new Date(e.end_date) < new Date())
                        .length
                    }
                  </span>
                  <span className="event-stat-label">Completed</span>
                </div>
              </div>

              <div className="events-container">
                <EventsTable events={events} />
              </div>
            </Tab.Pane>

            {/* Leaderboard Tab */}
            <Tab.Pane eventKey="leaderboard">
              <div className="content-header">
                <h2>Siege Leaderboard</h2>
              </div>
              <div className="leaderboard-container">
                <SiegeLeaderboard leaderboard={leaderboard} />
                {/* Additional leaderboard stats could go here */}
                <div className="leaderboard-info">
                  <p>
                    Points are earned by participating in clan events and
                    competitions:
                  </p>
                  <div className="points-categories">
                    <div className="points-category">
                      <h4>Long Events</h4>
                      <ul>
                        <li>1st place: 15 points</li>
                        <li>2nd place: 10 points</li>
                        <li>3rd place: 5 points</li>
                        <li>Participation: 2 points</li>
                      </ul>
                    </div>
                    <div className="points-category">
                      <h4>Short Events (1-2 hours)</h4>
                      <ul>
                        <li>All participants: 2 points</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Pane>

            {/* Clan Ranks Tab */}
            <Tab.Pane eventKey="ranks">
              <div className="content-header">
                <h2>Clan Ranks</h2>
              </div>
              <div className="ranks-container">
                <ClanRanks />
              </div>
            </Tab.Pane>
          </Tab.Content>
        </div>
      </Tab.Container>
    </div>
  );
}
