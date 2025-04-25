import React, { useMemo } from 'react';
import "./EventsTable.css";

export default function EventsTable({ 
  events, 
  activeLimit = null, 
  upcomingLimit = null, 
  completedLimit = null,
  hideHeaders = false
}) {
  // Process and categorize events
  const { activeEvents, upcomingEvents, recentCompletedEvents } = useMemo(() => {
    const now = new Date();
    const active = [];
    const upcoming = [];
    const completed = [];

    events.forEach(event => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      const endDate = event.end_date ? new Date(event.end_date) : null;
      
      if (!startDate || !endDate) return;
      
      if (now < startDate) {
        upcoming.push({...event, timeUntil: startDate - now});
      } else if (now > endDate) {
        completed.push({...event, completedAt: endDate});
      } else {
        active.push({...event, timeRemaining: endDate - now});
      }
    });

    // Sort upcoming by closest start date
    upcoming.sort((a, b) => a.timeUntil - b.timeUntil);
    
    // Sort active by soonest to end
    active.sort((a, b) => a.timeRemaining - b.timeRemaining);
    
    // Sort completed by most recent
    completed.sort((a, b) => b.completedAt - a.completedAt);
    
    // Apply limits if specified
    const limitedActive = activeLimit !== null ? active.slice(0, activeLimit) : active;
    const limitedUpcoming = upcomingLimit !== null ? upcoming.slice(0, upcomingLimit) : upcoming;
    const limitedCompleted = completedLimit !== null ? completed.slice(0, completedLimit) : completed;
    
    return {
      activeEvents: limitedActive,
      upcomingEvents: limitedUpcoming,
      recentCompletedEvents: limitedCompleted,
    };
  }, [events, activeLimit, upcomingLimit, completedLimit]);

  // Format the date consistently (handles UTC correctly)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
    });
  };
  
  // Format the time consistently (handles UTC correctly)
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const formatRelativeTime = (milliseconds) => {
    if (!milliseconds) return '';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return 'less than a minute';
    }
  };

  if (events.length === 0) {
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

  return (
    <div className="ui-events-tables">
      {hasActiveEvents && (
        <div className="ui-event-section">
          {!hideHeaders && (
            <h3 className="ui-section-heading">Active Events</h3>
          )}
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
                {activeEvents.map((event) => (
                  <tr key={event.id} className="ui-event-row ui-event-active">
                    <td>
                      <strong className="ui-event-name">{event.name}</strong>
                    </td>
                    <td className="ui-event-date">
                      {formatDate(event.end_date)} at {formatTime(event.end_date)}
                    </td>
                    <td>
                      <span className="ui-badge ui-badge-warning">
                        {formatRelativeTime(event.timeRemaining)} left
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasUpcomingEvents && (
        <div className="ui-event-section">
          {!hideHeaders && (
            <h3 className="ui-section-heading">Upcoming Events</h3>
          )}
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
                      <strong className="ui-event-name">{event.name}</strong>
                    </td>
                    <td className="ui-event-date">
                      {formatDate(event.start_date)} at {formatTime(event.start_date)}
                    </td>
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
          {!hideHeaders && (
            <h3 className="ui-section-heading">Completed Events</h3>
          )}
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
                      <strong className="ui-event-name">{event.name}</strong>
                    </td>
                    <td className="ui-event-date">{formatDate(event.end_date)}</td>
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

      {/* Show message if no events of any type are available */}
      {!hasActiveEvents && !hasUpcomingEvents && !hasCompletedEvents && (
        <div className="ui-empty-message">
          <p>No events available</p>
        </div>
      )}
    </div>
  );
}
