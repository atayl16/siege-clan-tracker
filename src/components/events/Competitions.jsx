import React, { useState, useMemo } from "react";
import EventsTable from "../EventsTable";
import { useEvents } from "../../hooks/useEvents";
import {
  FaSearch,
  FaTimes,
  FaInfoCircle,
} from "react-icons/fa";

// Import UI components
import Button from "../ui/Button";

import LoadError from "../ui/LoadError";

/**
 * The Events page's Competitions tab: the clan's WOM competitions (active,
 * upcoming and completed), with search and the event types explained.
 */
export default function Competitions() {
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

  // "3 active · 233 completed": one line beside the search box. Three big
  // counters here took about 170px above the list of events.
  const summary = useMemo(() => {
    if (!events || eventsLoading || eventsError) return "";
    const now = new Date();
    let active = 0;
    let upcoming = 0;
    let completed = 0;
    for (const e of events) {
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      if (start > now) upcoming += 1;
      else if (end < now) completed += 1;
      else if (start <= now && end >= now) active += 1;
    }
    return [
      `${active} active`,
      upcoming > 0 && `${upcoming} upcoming`,
      `${completed} completed`,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [events, eventsLoading, eventsError]);

  return (
    <>
      {eventsLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading event data...</div>
        </div>
      )}

      {eventsError && (
        <LoadError what="events" error={eventsError} onRetry={refreshEvents} />
      )}

      <div className="events-tab-toolbar">
        {summary && <p className="events-summary">{summary}</p>}
        <div className="event-filters-container">
          <div className="event-search-input-wrapper">
            <FaSearch className="event-search-icon" />
            <input
              type="text"
              className="event-search-input"
              placeholder="Search events..."
              aria-label="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="event-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* What each kind of event is. Below the list: people come here for
          this week's events, and this is reading for newer members. */}
      <div className="ui-section-container event-info-container">
        <div className="event-info-header">
          <FaInfoCircle className="event-info-icon" />
          <h3>About Our Events</h3>
        </div>
        <div className="event-info-content">
          <p>
            We encourage our clan members to enjoy different play styles, hang
            out with each other and most of all have fun! To help this, we
            host regular events, including:
          </p>

          <div className="event-types-grid">
            <div className="event-type-card">
              <h4>SotW</h4>
              <p>
                Skill of the Week - A competition to gain the most XP in a
                specific skill over 7 days.
              </p>
            </div>

            <div className="event-type-card">
              <h4>BotW</h4>
              <p>
                Boss of the Week - A competition to get the most kills at a
                specific boss over 7 days.
              </p>
            </div>

            <div className="event-type-card">
              <h4>Raids</h4>
              <p>
                We host regular raid events including group raids, learner
                raids with experienced teachers, and Raid Week.
              </p>
            </div>

            <div className="event-type-card">
              <h4>Bingo/Tile Races</h4>
              <p>
                Teams compete to complete tasks on a bingo board within a time
                limit. Winners receive prizes!
              </p>
            </div>

            <div className="event-type-card">
              <h4>Member-run Events</h4>
              <p>
                Short events (1-2 hours) organized by clan members, such as
                group bossing, skilling, minigames, hide and seek, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
