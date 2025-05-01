import React, { useState, useMemo } from "react";
import EventsTable from "../components/EventsTable";
import { useEvents } from "../hooks/useEvents";
import { FaSearch, FaTimes } from "react-icons/fa";

// Import UI components
import Button from "../components/ui/Button";
import StatGroup from "../components/ui/StatGroup";

import "./EventsPage.css";

export default function EventsPage() {
  // Get events data
  const { events, loading: eventsLoading, error: eventsError, refreshEvents } = useEvents();
  
  // State for filters and expanded views
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter events based on search term and filter type
  const filteredEvents = useMemo(() => {
    return events || [];
  }, [events]);

  return (
    <div className="ui-page-container">
      {eventsLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading event data...</div>
        </div>
      )}

      {eventsError && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Events</h3>
            <p>{eventsError.message || "Failed to load events"}</p>
            <Button onClick={refreshEvents} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>Clan Events</h2>
        <div className="ui-events-filters-container">
          <div className="ui-search-input-wrapper">
            <FaSearch className="ui-search-icon" />
            <input
              type="text"
              className="ui-search-input"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="ui-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>

      <StatGroup className="ui-events-summary">
        <StatGroup.Stat
          label="Active"
          value={
            !events
              ? 0
              : events.filter(
                  (e) =>
                    new Date(e.start_date) <= new Date() &&
                    new Date(e.end_date) >= new Date()
                ).length
          }
        />
        <StatGroup.Stat
          label="Upcoming"
          value={
            !events
              ? 0
              : events.filter((e) => new Date(e.start_date) > new Date()).length
          }
        />
        <StatGroup.Stat
          label="Completed"
          value={
            !events
              ? 0
              : events.filter((e) => new Date(e.end_date) < new Date()).length
          }
        />
      </StatGroup>

      <div className="ui-section-container">
        <EventsTable
          events={filteredEvents}
          activeLimit={showAllEvents ? null : 10}
          upcomingLimit={showAllEvents ? null : 6}
          completedLimit={showAllEvents ? null : 5}
          loading={eventsLoading}
          searchTerm={searchTerm}
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
    </div>
  );
}
