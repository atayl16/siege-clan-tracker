import React, { useEffect, useState, useMemo } from "react";
import { Tab, Nav, Form, InputGroup } from "react-bootstrap";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL parameters
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [activeKey, setActiveKey] = useState(
    location.hash ? location.hash.substring(1) : "members"
  );

  // State for lazy loading and expanded views
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [eventsSearchTerm, setEventsSearchTerm] = useState('');
  const [eventsFilterType, setEventsFilterType] = useState('all');
  
  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);
  
  // Filter events based on search term and filter type
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.name?.toLowerCase().includes(eventsSearchTerm.toLowerCase());
      
      if (eventsFilterType === 'active') {
        const now = new Date();
        return matchesSearch && 
          new Date(event.start_date) <= now && 
          new Date(event.end_date) >= now;
      }
      
      if (eventsFilterType === 'upcoming') {
        return matchesSearch && new Date(event.start_date) > new Date();
      }
      
      if (eventsFilterType === 'completed') {
        return matchesSearch && new Date(event.end_date) < new Date();
      }
      
      return matchesSearch; // 'all' filter
    });
  }, [events, eventsSearchTerm, eventsFilterType]);
  

  // Update URL when tab changes and trigger lazy loading
  const handleTabChange = (tabKey) => {
    setActiveKey(tabKey);
    navigate({ hash: tabKey });
    
    // Lazy load data when tab is first accessed
    if (tabKey === "events" && !eventsLoaded) {
      setEventsLoaded(true);
      // You could optionally fetch events data here if not already loaded
    }
    
    if (tabKey === "leaderboard" && !leaderboardLoaded) {
      setLeaderboardLoaded(true);
      // You could optionally fetch leaderboard data here if not already loaded
    }
  };

  // Update URL when search term changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Only update URL params if search has content
    if (value) {
      setSearchParams({ search: value });
    } else {
      // Remove search param if empty
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  };
  
  // Initial data fetch - only load members initially, then preload events count
  useEffect(() => {
    setLoading(true);
    
    fetch("/api/members")
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
        return res.json();
      })
      .then(membersData => {
        setMembers(membersData);
        setLoading(false);
        
        // Preload events data in the background after members load
        // This ensures we have the count available for the navigation badge
        setEventsLoaded(true);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  // Lazy load events when needed
  useEffect(() => {
    if (eventsLoaded && events.length === 0) {
      fetch("/api/events")
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
          return res.json();
        })
        .then(eventsData => {
          setEvents(eventsData);
        })
        .catch(err => {
          console.error("Error fetching events:", err);
          // Maybe show a specific error for events
        });
    }
  }, [eventsLoaded, events.length]);

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
        onSelect={handleTabChange}
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
                    onChange={handleSearchChange}
                  />
                </InputGroup>
              </div>
              <div className="member-table-container table-responsive w-100">
                <MemberTable members={filteredMembers} />
              </div>
            </Tab.Pane>

            {/* Overview Tab */}
            <Tab.Pane eventKey="overview">
              <div className="content-header">
                <h2>Clan Overview</h2>
              </div>

              <div className="events-container">
                {/* Clan Information section */}
                <h3 className="section-title">Clan Information</h3>
                <div className="clan-info-row">
                  <div className="info-card">
                    <div className="info-label">
                      <FaCalendarDay /> Founded
                    </div>
                    <div className="info-value">April 23, 2022</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Community Links</div>
                    <div className="info-links">
                      <a
                        href="https://discord.gg/aXYHD6UdQJ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <FaDiscord /> Discord Server
                      </a>
                      <a
                        href="https://wiseoldman.net/groups/2928"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
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

                <h3 className="section-title">Events & Rankings</h3>
                <div className="overview-card-row">
                  <div className="overview-card">
                    <div className="overview-card-header">Active Events</div>
                    <div className="overview-card-content">
                      <EventsTable
                        events={events}
                        activeLimit={3}
                        upcomingLimit={0}
                        completedLimit={0}
                        hideHeaders={true}
                      />
                    </div>
                  </div>
                  <div className="overview-card">
                    <div className="overview-card-header">Top Players</div>
                    <div className="overview-card-content">
                      <Leaderboard members={members} limit={3} compact={true} />
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Pane>
            
            {/* Events Tab */}
            <Tab.Pane eventKey="events">
              <div className="members-content-header">
                <h2>Clan Events</h2>
                <div className="events-filters-container">
                  <InputGroup className="events-search">
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search events..."
                      value={eventsSearchTerm}
                      onChange={(e) => setEventsSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                  <Form.Select
                    className="event-type-filter"
                    value={eventsFilterType}
                    onChange={(e) => setEventsFilterType(e.target.value)}
                  >
                    <option value="all">All Events</option>
                    <option value="active">Active Events</option>
                    <option value="upcoming">Upcoming Events</option>
                    <option value="completed">Completed Events</option>
                  </Form.Select>
                </div>
              </div>
            
              <div className="events-summary">
                <div className="event-stat">
                  <span className="event-stat-value">
                    {events.filter(e => 
                      new Date(e.start_date) <= new Date() && 
                      new Date(e.end_date) >= new Date()
                    ).length}
                  </span>
                  <span className="event-stat-label">Active</span>
                </div>
                <div className="event-stat">
                  <span className="event-stat-value">
                    {events.filter(e => new Date(e.start_date) > new Date()).length}
                  </span>
                  <span className="event-stat-label">Upcoming</span>
                </div>
                <div className="event-stat">
                  <span className="event-stat-value">
                    {events.filter(e => new Date(e.end_date) < new Date()).length}
                  </span>
                  <span className="event-stat-label">Completed</span>
                </div>
              </div>
            
              <div className="events-container">
                <EventsTable
                  events={filteredEvents}
                  activeLimit={showAllEvents ? null : 3}
                  upcomingLimit={showAllEvents ? null : 5}
                  completedLimit={showAllEvents ? null : 5}
                />
              </div>
            
              <div className="text-center mt-3">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                >
                  {showAllEvents ? "Show Less" : "Show All Events"}
                </button>
              </div>
            </Tab.Pane>

            {/* Leaderboard Tab */}
            <Tab.Pane eventKey="leaderboard">
              <div className="content-header">
                <h2>Siege Score Leaderboard</h2>
              </div>
              <div className="leaderboard-container">
                <Leaderboard
                  members={members}
                  showTitle={false}
                  limit={showFullLeaderboard ? null : 10}
                />

                {/* Toggle button */}
                <div className="text-center mt-3">
                  {members.filter((m) => (parseInt(m.siege_score) || 0) > 0)
                    .length > 10 && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() =>
                        setShowFullLeaderboard(!showFullLeaderboard)
                      }
                    >
                      {showFullLeaderboard
                        ? "Show Less"
                        : "Show Full Leaderboard"}
                    </button>
                  )}
                </div>

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
