import React, { useState, useMemo } from "react";
import EventsTable from "../components/EventsTable";
import { useEvents } from "../hooks/useEvents";
import {
  FaSearch,
  FaTimes,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

// Import UI components
import Button from "../components/ui/Button";
import StatGroup from "../components/ui/StatGroup";

import "./EventsPage.css";

export default function EventsPage() {
  // Get events data
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refreshEvents,
  } = useEvents();

  // State for filters and expanded views
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // Filter events based on search term and filter type
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!searchTerm.trim()) return events;

    const term = searchTerm.toLowerCase().trim();
    return events.filter(
      (event) =>
        (event.name && event.name.toLowerCase().includes(term)) ||
        (event.type && event.type.toLowerCase().includes(term)) ||
        (event.metric && event.metric.toLowerCase().includes(term))
    );
  }, [events, searchTerm]);

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

      {/* Event Types Info Section */}
      <div className="ui-section-container ui-events-info-container">
        <div
          className="ui-events-info-header"
          onClick={() => setShowInfo(!showInfo)}
        >
          <FaInfoCircle className="ui-events-info-icon" />
          <h3>About Our Events</h3>
          {showInfo ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        {showInfo && (
          <div className="ui-events-info-content">
            <p>
              We encourage our clan members to enjoy different play styles, hang
              out with each other and most of all have fun! To help this, we
              host regular events, including:
            </p>

            <div className="ui-events-types-grid">
              <div className="ui-event-type-card">
                <h4>SotW</h4>
                <p>
                  Skill of the Week - A competition to gain the most XP in a
                  specific skill over 7 days.
                </p>
              </div>

              <div className="ui-event-type-card">
                <h4>BotW</h4>
                <p>
                  Boss of the Week - A competition to get the most kills at a
                  specific boss over 7 days.
                </p>
              </div>

              <div className="ui-event-type-card">
                <h4>Raids</h4>
                <p>
                  We host regular raid events including group raids, learner
                  raids with experienced teachers, and Raid Week.
                </p>
              </div>

              <div className="ui-event-type-card">
                <h4>Bingo/Tile Races</h4>
                <p>
                  Teams compete to complete tasks on a bingo board within a time
                  limit. Winners receive prizes!
                </p>
              </div>

              <div className="ui-event-type-card">
                <h4>Member-run Events</h4>
                <p>
                  Short events (1-2 hours) organized by clan members, such as
                  group bossing, skilling, minigames, hide and seek, and more.
                </p>
              </div>
            </div>
          </div>
        )}
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
