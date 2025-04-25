import React, { useEffect, useState, useMemo } from "react";
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
  FaTimes,
} from "react-icons/fa";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";
import FormInput from "../components/ui/FormInput";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import StatGroup from "../components/ui/StatGroup";

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
  const [activeTab, setActiveTab] = useState(
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
    setActiveTab(tabKey);
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
    <div className="ui-siege-dashboard">
      {loading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading clan data...</div>
        </div>
      )}

      {error && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Main content with tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={handleTabChange}
        className="ui-dashboard-tabs"
      >
        <Tabs.Tab
          tabId="members"
          label="Members"
          icon={<FaUsers />}
          badge={members.length}
        >
          <div className="ui-content-header">
            <h2>Clan Members</h2>
            <div className="ui-search-container">
              <div className="ui-search-input-wrapper">
                <FaSearch className="ui-search-icon" />
                <input
                  type="text"
                  className="ui-search-input"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <button
                    className="ui-clear-search"
                    onClick={() => {
                      setSearchTerm("");
                      searchParams.delete("search");
                      setSearchParams(searchParams);
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="ui-member-table-container">
            <MemberTable members={filteredMembers} />
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="overview" label="Overview" icon={<FaChartBar />}>
          <div className="ui-content-header">
            <h2>Clan Overview</h2>
          </div>


          <div className="ui-section-container">
          <h3 className="ui-section-title">Clan Stats</h3>
          <StatGroup className="ui-stats-group">
            <StatGroup.Stat label="Members" value={members.length} />
            <StatGroup.Stat
              label="Total XP"
              value={(() => {
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
            />
            <StatGroup.Stat
              label="Avg. Level"
              value={Math.floor(
                members.reduce(
                  (sum, m) => sum + (parseInt(m.current_lvl) || 0),
                  0
                ) / Math.max(1, members.length)
              )}
            />
            </StatGroup>
            
            {/* Clan Information section */}
            <h3 className="ui-section-title">Clan Information</h3>
            <div className="ui-clan-info-row">
              <Card className="ui-info-card" variant="dark">
                <Card.Body>
                  <div className="ui-info-label">
                    <FaCalendarDay /> Founded
                  </div>
                  <div className="ui-info-value">April 23, 2022</div>
                </Card.Body>
              </Card>
              <Card className="ui-info-card" variant="dark">
                <Card.Body>
                  <div className="ui-info-label">Community Links</div>
                  <div className="ui-info-links">
                    <a
                      href="https://discord.gg/aXYHD6UdQJ"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-resource-link"
                    >
                      <FaDiscord /> Discord Server
                    </a>
                    <a
                      href="https://wiseoldman.net/groups/2928"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-resource-link"
                    >
                      <FaChartLine /> WiseOldMan Stats
                    </a>
                  </div>
                </Card.Body>
              </Card>
            </div>

            <h3 className="ui-section-title">Events & Rankings</h3>
            <div className="ui-overview-card-row">
              <Card className="ui-overview-card" variant="dark">
                <Card.Header>Events</Card.Header>
                <Card.Body>
                  <EventsTable
                    events={events}
                    activeLimit={3}
                    upcomingLimit={3}
                    completedLimit={2}
                    hideHeaders={true}
                  />
                </Card.Body>
              </Card>
              <Card className="ui-overview-card" variant="dark">
                <Card.Header>Top Players</Card.Header>
                <Card.Body>
                  <Leaderboard members={members} limit={3} compact={true} />
                </Card.Body>
              </Card>
            </div>
          </div>
        </Tabs.Tab>

        <Tabs.Tab
          tabId="events"
          label="Events"
          icon={<FaCalendarAlt />}
          badge={events.length}
        >
          <div className="ui-content-header">
            <h2>Clan Events</h2>
            <div className="ui-events-filters-container">
              <div className="ui-search-input-wrapper">
                <FaSearch className="ui-search-icon" />
                <input
                  type="text"
                  className="ui-search-input"
                  placeholder="Search events..."
                  value={eventsSearchTerm}
                  onChange={(e) => setEventsSearchTerm(e.target.value)}
                />
                {eventsSearchTerm && (
                  <button
                    className="ui-clear-search"
                    onClick={() => setEventsSearchTerm("")}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <select
                className="ui-form-select"
                value={eventsFilterType}
                onChange={(e) => setEventsFilterType(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="active">Active Events</option>
                <option value="upcoming">Upcoming Events</option>
                <option value="completed">Completed Events</option>
              </select>
            </div>
          </div>

          <StatGroup className="ui-events-summary">
            <StatGroup.Stat
              label="Active"
              value={
                events.filter(
                  (e) =>
                    new Date(e.start_date) <= new Date() &&
                    new Date(e.end_date) >= new Date()
                ).length
              }
            />
            <StatGroup.Stat
              label="Upcoming"
              value={
                events.filter((e) => new Date(e.start_date) > new Date()).length
              }
            />
            <StatGroup.Stat
              label="Completed"
              value={
                events.filter((e) => new Date(e.end_date) < new Date()).length
              }
            />
          </StatGroup>

          <div className="ui-section-container">
            <EventsTable
              events={filteredEvents}
              activeLimit={showAllEvents ? null : 3}
              upcomingLimit={showAllEvents ? null : 5}
              completedLimit={showAllEvents ? null : 5}
            />
          </div>

          <div className="ui-button-center">
            <Button
              variant="secondary"
              onClick={() => setShowAllEvents(!showAllEvents)}
            >
              {showAllEvents ? "Show Less" : "Show All Events"}
            </Button>
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="leaderboard" label="Leaderboard" icon={<FaTrophy />}>
          <div className="ui-content-header">
            <h2>Siege Score Leaderboard</h2>
          </div>
          <div className="ui-section-container">
            <Leaderboard
              members={members}
              showTitle={false}
              limit={showFullLeaderboard ? null : 10}
            />

            {/* Toggle button */}
            {members.filter((m) => (parseInt(m.siege_score) || 0) > 0).length >
              10 && (
              <div className="ui-button-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
                >
                  {showFullLeaderboard ? "Show Less" : "Show Full Leaderboard"}
                </Button>
              </div>
            )}

            <Card className="ui-leaderboard-info" variant="dark">
              <Card.Body>
                <p>
                  Points are earned by participating in clan events and
                  competitions:
                </p>
                <div className="ui-points-categories">
                  <div className="ui-points-category ui-points-category-long">
                    <h4>Long Events</h4>
                    <ul>
                      <li>1st place: 15 points</li>
                      <li>2nd place: 10 points</li>
                      <li>3rd place: 5 points</li>
                      <li>Participation: 2 points</li>
                    </ul>
                  </div>
                  <div className="ui-points-category ui-points-category-short">
                    <h4>Short Events (1-2 hours)</h4>
                    <ul>
                      <li>All participants: 2 points</li>
                    </ul>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="ranks" label="Clan Ranks" icon={<FaMedal />}>
          <div className="ui-content-header">
            <h2>Clan Ranks</h2>
          </div>
          <div className="ui-section-container">
            <ClanRanks />
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
