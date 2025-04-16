import React, { useEffect, useState, useMemo } from "react";
import { Nav, Form, InputGroup, Button, Badge } from "react-bootstrap";
import EventsTable from "../components/EventsTable";
import {
  FaSearch,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarDay,
  FaCalendarPlus,
} from "react-icons/fa";
import "./EventsPage.css";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // Changed default to active
  const [filterType, setFilterType] = useState("all");
  
  // Filter events based on search and type filters
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by event type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }
    
    // Filter by tab (status)
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return filtered.filter(event => new Date(event.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    } else if (activeTab === 'active') {
      return filtered.filter(event => 
        new Date(event.start_date) <= now && 
        new Date(event.end_date) >= now
      ).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    } else if (activeTab === 'completed') {
      return filtered.filter(event => new Date(event.end_date) < now)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    }
    
    return filtered;
  }, [events, searchTerm, filterType, activeTab]);
  
  // Get event type options from data
  const eventTypes = useMemo(() => {
    const types = new Set(events.map(event => event.type));
    return ['all', ...Array.from(types)];
  }, [events]);

  // Fetch events data on component mount
  useEffect(() => {
    setLoading(true);
    
    fetch("/api/events")
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching events:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Get counts for badges
  const upcomingCount = useMemo(() => 
    events.filter(e => new Date(e.start_date) > new Date()).length, 
  [events]);
  
  const activeCount = useMemo(() => 
    events.filter(e => 
      new Date(e.start_date) <= new Date() && 
      new Date(e.end_date) >= new Date()
    ).length, 
  [events]);
  
  const completedCount = useMemo(() => 
    events.filter(e => new Date(e.end_date) < new Date()).length, 
  [events]);

  return (
    <div className="siege-dashboard">
      <div className="dashboard-header">
        <h1>Siege Events</h1>
        <div className="sync-buttons">
          <Button variant="primary">
            <FaCalendarPlus /> Request Event
          </Button>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading events data...</div>
        </div>
      )}

      {error && (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <h3>Error Loading Events</h3>
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

      {!loading && !error && (
        <div className="dashboard-container">
          <Nav variant="pills" className="dashboard-nav">
            {/* Reordered tabs to put Active first */}
            <Nav.Item>
              <Nav.Link
                active={activeTab === "active"}
                onClick={() => setActiveTab("active")}
              >
                <FaCalendarCheck /> Active Events{" "}
                <Badge bg="warning" text="dark">
                  {activeCount}
                </Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "upcoming"}
                onClick={() => setActiveTab("upcoming")}
              >
                <FaCalendarAlt /> Upcoming Events{" "}
                <Badge bg="info">{upcomingCount}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "completed"}
                onClick={() => setActiveTab("completed")}
              >
                <FaCalendarDay /> Completed Events{" "}
                <Badge bg="secondary">{completedCount}</Badge>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <div className="dashboard-content">
            <div className="events-content-header">
              <h2>
                {activeTab === "upcoming" && "Upcoming Events"}
                {activeTab === "active" && "Active Events"}
                {activeTab === "completed" && "Completed Events"}
              </h2>

              <div className="events-filters">
                <InputGroup className="events-search">
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                <Form.Select
                  className="event-type-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "all"
                        ? "All Event Types"
                        : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            {/* Removed event stats section as requested */}

            <div className="events-container">
              {filteredEvents.length === 0 ? (
                <div className="no-events-message">
                  <FaCalendarAlt className="no-events-icon" />
                  <p>
                    No {activeTab} events found
                    {searchTerm ? " matching your search" : ""}.
                  </p>
                </div>
              ) : (
                <EventsTable
                  events={filteredEvents}
                  showSignupButton={
                    activeTab === "upcoming" || activeTab === "active"
                  }
                  showResults={activeTab === "completed"}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
