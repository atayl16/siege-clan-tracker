import React, { useMemo } from 'react';
import "./EventsTable.css";

export default function EventsTable({ events }) {
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
    
    return {
      activeEvents: active,
      upcomingEvents: upcoming,
      recentCompletedEvents: completed,
    };
  }, [events]);

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
      <div className="alert alert-info">No events found</div>
    );
  }

  return (
    <div className="events-tables">
      {activeEvents.length > 0 && (
        <div className="event-section">
          <h5 className="mb-3">Active Events</h5>
          <table className="table table-dark table-hover table-sm">
            <thead>
              <tr>
                <th>Event</th>
                <th>Ends</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {activeEvents.map(event => (
                <tr key={event.id} className="table-success">
                  <td>
                    <strong>{event.name}</strong>
                  </td>
                  <td>
                    {formatDate(event.end_date)} at {formatTime(event.end_date)}
                  </td>
                  <td>
                    <span className="badge bg-warning text-dark">
                      {formatRelativeTime(event.timeRemaining)} left
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="event-section mt-4">
          <h5 className="mb-3">Upcoming Events</h5>
          <table className="table table-dark table-hover table-sm">
            <thead>
              <tr>
                <th>Event</th>
                <th>Starts</th>
                <th>Starting In</th>
              </tr>
            </thead>
            <tbody>
              {upcomingEvents.map(event => (
                <tr key={event.id} className="table-info">
                  <td>
                    <strong>{event.name}</strong>
                  </td>
                  <td>
                    {formatDate(event.start_date)} at {formatTime(event.start_date)}
                  </td>
                  <td>
                    <span className="badge bg-secondary">
                      {formatRelativeTime(event.timeUntil)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {recentCompletedEvents.length > 0 && (
        <div className="event-section mt-4">
          <h5 className="mb-3">Recently Completed Events</h5>
          <table className="table table-dark table-hover table-sm">
            <thead>
              <tr>
                <th>Event</th>
                <th>Ended</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {recentCompletedEvents.map(event => (
                <tr key={event.id} className="table-secondary">
                  <td>
                    <strong>{event.name}</strong>
                  </td>
                  <td>
                    {formatDate(event.end_date)}
                  </td>
                  <td>
                    {event.winner_username ? (
                      <span className="winner-badge">
                        🏆 {event.winner_username}
                      </span>
                    ) : (
                      <span className="text-muted">No winner recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
