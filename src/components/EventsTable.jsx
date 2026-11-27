import React, { Fragment, useMemo } from "react";
import { useCompetitions } from "../hooks/useCompetitions";
import { useCompetitionLeaders } from "../hooks/useCompetitionLeaders";
import MetricIcon from "./MetricIcon"; // Use MetricIcon
import PlaceBadge from "./PlaceBadge";
import { SKILL_METRICS } from "../utils/skillLevels";
import { formatXp } from "../utils/xpWeek";
import { formatDate } from "../utils/dates";
import { formatNumber } from "../utils/numbers";
import "./EventsTable.css";

export default function EventsTable({
  events = [],
  activeLimit = null,
  upcomingLimit = null,
  completedLimit = null,
  hideHeaders = false,
  includeWomCompetitions = true,
  searchTerm = "",
}) {
  // Get competitions data from the new hook
  const { competitions, loading: womLoading } = useCompetitions();

  // Combine local events with WOM competitions
  const combinedEvents = useMemo(() => {
    if (!includeWomCompetitions || !competitions || !Array.isArray(competitions)) return events || [];

    // Create a set of WOM IDs that are already in the database
    const existingWomIds = new Set();
    (events || []).forEach((event) => {
      if (event.wom_id) {
        existingWomIds.add(event.wom_id.toString());
      }
    });

    // Convert WOM competitions to match our event format
    const uniqueWomEvents = competitions
      .filter((comp) => !existingWomIds.has(comp.id.toString()))
      .map((comp) => ({
        id: `wom-${comp.id}`,
        name: comp.title,
        type: comp.metric,
        start_date: comp.startsAt,
        end_date: comp.endsAt,
        is_wom: true,
        wom_id: comp.id,
      }));

    let filteredWomEvents = uniqueWomEvents;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filteredWomEvents = uniqueWomEvents.filter(
        (event) =>
          (event.name && event.name.toLowerCase().includes(term)) ||
          (event.type && event.type.toLowerCase().includes(term)) ||
          (event.metric && event.metric.toLowerCase().includes(term))
      );
    }

    return [...(events || []), ...filteredWomEvents];
  }, [events, competitions, includeWomCompetitions, searchTerm]);

  // Process and categorize events
  const { activeEvents, upcomingEvents, recentCompletedEvents } = useMemo(() => {
    const now = new Date();
    const active = [];
    const upcoming = [];
    const completed = [];

    combinedEvents.forEach((event) => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      const endDate = event.end_date ? new Date(event.end_date) : null;

      if (!startDate || !endDate) return;

      if (now < startDate) {
        upcoming.push({ ...event, timeUntil: startDate - now });
      } else if (now > endDate) {
        completed.push({ ...event, completedAt: endDate });
      } else {
        active.push({ ...event, timeRemaining: endDate - now });
      }
    });

    // Sort upcoming by closest start date
    upcoming.sort((a, b) => a.timeUntil - b.timeUntil);

    // Sort active by soonest to end
    active.sort((a, b) => a.timeRemaining - b.timeRemaining);

    // Sort completed by most recent
    completed.sort((a, b) => b.completedAt - a.completedAt);

    // Apply limits if specified
    const limitedActive =
      activeLimit !== null ? active.slice(0, activeLimit) : active;
    const limitedUpcoming =
      upcomingLimit !== null ? upcoming.slice(0, upcomingLimit) : upcoming;
    const limitedCompleted =
      completedLimit !== null ? completed.slice(0, completedLimit) : completed;

    return {
      activeEvents: limitedActive,
      upcomingEvents: limitedUpcoming,
      recentCompletedEvents: limitedCompleted,
    };
  }, [combinedEvents, activeLimit, upcomingLimit, completedLimit]);

  // The top three of each running WOM competition. Only asked for when one
  // is on the page, and served from the edge cache.
  const leaders = useCompetitionLeaders(activeEvents.some((event) => event.wom_id));

  const eventDate = (value) => formatDate(value) || "N/A";

  const formatRelativeTime = (milliseconds) => {
    if (!milliseconds) return "";

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      return "less than a minute";
    }
  };

  // Show loading state when fetching WOM data
  if (womLoading) {
    return <div className="events-loading">Loading events...</div>;
  }

  if (combinedEvents.length === 0) {
    return (
      <div className="ui-empty-message">
        <p>No events found</p>
      </div>
    );
  }

  // Check if any category has events
  const hasActiveEvents = activeEvents.length > 0;
  const hasUpcomingEvents = upcomingEvents.length > 0;
  const hasCompletedEvents = recentCompletedEvents.length > 0;

  // Generate WOM competition URL
  const getWomCompetitionUrl = (womId) => {
    return `https://wiseoldman.net/competitions/${womId}`;
  };

  return (
    <div className="ui-events-tables">
      {hasActiveEvents && (
        <div className="ui-event-section">
          {!hideHeaders && <h3 className="ui-section-heading">Active Events</h3>}
          <div className="ui-table-container">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Ends</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {activeEvents.map((event) => {
                  const top = event.wom_id ? leaders[String(event.wom_id)] : null;
                  return (
                    <Fragment key={event.id}>
                      <tr className={`ui-event-row ui-event-active${top ? " has-leaders" : ""}`}>
                        <td>
                          <strong className="ui-event-name">
                            <span className="ui-event-skill-icon">
                              <MetricIcon metric={event.metric || event.type} />
                            </span>
                            {event.is_wom || event.wom_id ? (
                              <a
                                href={getWomCompetitionUrl(event.wom_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ui-event-wom-link"
                              >
                                {event.name}
                              </a>
                            ) : (
                              event.name
                            )}
                          </strong>
                        </td>
                        <td className="ui-event-date">{eventDate(event.end_date)}</td>
                        <td>
                          <span className="ui-badge ui-badge-warning">
                            {formatRelativeTime(event.timeRemaining)} left
                          </span>
                        </td>
                      </tr>
                      {top && (
                        <tr className="ui-event-leaders-row">
                          <td colSpan={3}>
                            <EventLeaders top={top} metric={event.metric || event.type} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasUpcomingEvents && (
        <div className="ui-event-section">
          {!hideHeaders && <h3 className="ui-section-heading">Upcoming Events</h3>}
          <div className="ui-table-container">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Starts</th>
                  <th>Starting In</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((event) => (
                  <tr key={event.id} className="ui-event-row ui-event-upcoming">
                    <td>
                      <strong className="ui-event-name">
                        <span className="ui-event-skill-icon">
                          <MetricIcon metric={event.metric || event.type} />
                        </span>
                        {event.is_wom || event.wom_id ? (
                          <a
                            href={getWomCompetitionUrl(event.wom_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-event-wom-link"
                          >
                            {event.name}
                          </a>
                        ) : (
                          event.name
                        )}
                      </strong>
                    </td>
                    <td className="ui-event-date">{eventDate(event.start_date)}</td>
                    <td>
                      <span className="ui-badge ui-badge-info">
                        {formatRelativeTime(event.timeUntil)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasCompletedEvents && (
        <div className="ui-event-section">
          {!hideHeaders && <h3 className="ui-section-heading">Completed Events</h3>}
          <div className="ui-table-container">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Ended</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {recentCompletedEvents.map((event) => (
                  <tr key={event.id} className="ui-event-row ui-event-completed">
                    <td>
                      <strong className="ui-event-name">
                        <span className="ui-event-skill-icon">
                          <MetricIcon metric={event.metric || event.type} />
                        </span>
                        {event.is_wom || event.wom_id ? (
                          <a
                            href={getWomCompetitionUrl(event.wom_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-event-wom-link"
                          >
                            {event.name}
                          </a>
                        ) : (
                          event.name
                        )}
                      </strong>
                    </td>
                    <td className="ui-event-date">{eventDate(event.end_date)}</td>
                    <td>
                      {event.winner_username ? (
                        <span className="ui-winner-badge">
                          🏆 {event.winner_username}
                        </span>
                      ) : (
                        <span className="ui-text-muted">No winner recorded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasActiveEvents && !hasUpcomingEvents && !hasCompletedEvents && (
        <div className="ui-empty-message">
          <p>No events available</p>
        </div>
      )}
    </div>
  );
}

/** "930K XP" for a skill, "4.2 hrs" for EHP or EHB, "12 KC" for anything else. */
export function formatGain(metric, gained) {
  const n = Number(gained) || 0;
  if (SKILL_METRICS.has(metric)) return `${formatXp(n)} XP`;
  if (metric === "ehp" || metric === "ehb") return `${Number(n.toFixed(1))} hrs`;
  return `${formatNumber(n)} KC`;
}

/** A running competition's top three, under its row in Active Events. */
function EventLeaders({ top, metric }) {
  return (
    <ol className="ui-event-leaders" aria-label="Top 3 so far">
      {top.map((p) => (
        <li key={p.name} className="ui-event-leader">
          <PlaceBadge place={p.place} size={22} />
          <span className="ui-event-leader-name">{p.name}</span>
          <span className="ui-event-leader-gain">{formatGain(metric, p.gained)}</span>
        </li>
      ))}
    </ol>
  );
}
