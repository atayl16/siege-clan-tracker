import React, { useEffect, useState, useMemo } from "react";
import { Tab, Nav, Form, InputGroup } from "react-bootstrap";
import MemberTable from "../components/MemberTable";
import Leaderboard from "../components/Leaderboard";
import EventsTable from "../components/EventsTable";
import ClanRanks from "../components/ClanRanks";
import {
  FaSearch,
  FaTrophy,
  FaCalendarAlt,
  FaUsers,
  FaMedal,
  FaChartBar,
  FaDiscord,
  FaChartLine,
  FaCalendarDay,
} from "react-icons/fa";
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
              <Nav.Link eventKey="overview">
                <FaChartBar /> Overview
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
              <div className="members-content-header">
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
            
            {/* Overview Tab */}
            <Tab.Pane eventKey="overview">
              <div className="content-header">
                <h2>Clan Overview</h2>
              </div>
              
              <div className="events-container">
                {/* New Clan Information section */}
                <h3 className="section-title">Clan Information</h3>
                <div className="clan-info-row">
                  <div className="info-card">
                    <div className="info-label"><FaCalendarDay /> Founded</div>
                    <div className="info-value">April 23, 2022</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Community Links</div>
                    <div className="info-links">
                      <a href="https://discord.gg/aXYHD6UdQJ" target="_blank" rel="noopener noreferrer" className="resource-link">
                        <FaDiscord /> Discord Server
                      </a>
                      <a href="https://wiseoldman.net/groups/2928" target="_blank" rel="noopener noreferrer" className="resource-link">
                        <FaChartLine /> WiseOldMan Stats
                      </a>
                    </div>
                  </div>
                </div>
                
                <h3 className="section-title">Clan Stats</h3>
                <div className="overview-stats-row">
                  <div className="overview-stat">
                    <div className="stat-label">Members</div>
                    <div className="stat-value">{members.length}</div>
                  </div>
                  <div className="overview-stat">
                    <div className="stat-label">Total XP</div>
                    <div className="stat-value">
                      {(() => {
                        const xpInMillions = Math.floor(
                          members.reduce(
                            (sum, m) => sum + (parseInt(m.current_xp) || 0),
                            0
                          ) / 1000000
                        );
            
                        return xpInMillions >= 1000 
                          ? `${(xpInMillions / 1000).toFixed(1)}B` 
                          : `${xpInMillions}M`;
                      })()}
                    </div>
                  </div>
                  <div className="overview-stat">
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
                
                <h3 className="section-title">Active Events</h3>
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
                      <div key={event.id} className="event-row">
                        <strong>{event.name}</strong>
                        <span className="badge bg-warning text-dark">
                          Ends {new Date(event.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                )}
                
                <h3 className="section-title">Top Players</h3>
                <div className="overview-leaderboard">
                  <Leaderboard members={members} limit={3} compact={true} />
                </div>
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
                <Leaderboard members={members} showTitle={false} />
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
