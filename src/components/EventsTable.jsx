import React, { useMemo } from 'react';
import { useCompetitions } from '../hooks/useCompetitions'; // Updated to use new hook
import './EventsTable.css';

export default function EventsTable({ 
  events = [],
  activeLimit = null, 
  upcomingLimit = null, 
  completedLimit = null,
  hideHeaders = false,
  includeWomCompetitions = true
}) {
  // Get competitions data from the new hook
  const { competitions, loading: womLoading } = useCompetitions();
  
  // Combine local events with WOM competitions
  const combinedEvents = useMemo(() => {
    if (!includeWomCompetitions || !competitions) return events || [];
    
    // Create a set of WOM IDs that are already in the database
    const existingWomIds = new Set();
    (events || []).forEach(event => {
      if (event.wom_id) {
        existingWomIds.add(event.wom_id.toString());
      }
    });
    
    // Convert WOM competitions to match our event format
    // but only include those not already in our database
    const uniqueWomEvents = competitions
      .filter(comp => !existingWomIds.has(comp.id.toString()))
      .map(comp => {
        // Find current leader if competition has participants
        let currentLeader = null;
        let leaderGain = 0;
        
        if (comp.participants && comp.participants.length > 0) {
          // Sort participants by progress (descending)
          const sortedParticipants = [...comp.participants].sort((a, b) => b.progress.gained - a.progress.gained);
          if (sortedParticipants.length > 0) {
            currentLeader = sortedParticipants[0].player.displayName;
            leaderGain = sortedParticipants[0].progress.gained;
          }
        }
        
        return {
          id: `wom-${comp.id}`,
          name: comp.title,
          type: comp.metric,
          start_date: comp.startsAt,
          end_date: comp.endsAt,
          is_wom: true,
          wom_id: comp.id,
          currentLeader: currentLeader,
          leaderGain: leaderGain
        };
      });
    
    // Also add leader data to existing events that have wom_id
    const enhancedEvents = (events || []).map(event => {
      if (event.wom_id) {
        const matchingComp = competitions.find(comp => comp.id.toString() === event.wom_id.toString());
        if (matchingComp && matchingComp.participants && matchingComp.participants.length > 0) {
          const sortedParticipants = [...matchingComp.participants].sort((a, b) => b.progress.gained - a.progress.gained);
          if (sortedParticipants.length > 0) {
            return {
              ...event,
              currentLeader: sortedParticipants[0].player.displayName,
              leaderGain: sortedParticipants[0].progress.gained
            };
          }
        }
      }
      return event;
    });
    
    return [...enhancedEvents, ...uniqueWomEvents];
  }, [events, competitions, includeWomCompetitions]);
  
  // Process and categorize events
  const { activeEvents, upcomingEvents, recentCompletedEvents } = useMemo(() => {
    const now = new Date();
    const active = [];
    const upcoming = [];
    const completed = [];

    combinedEvents.forEach(event => {
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
  }, [combinedEvents, activeLimit, upcomingLimit, completedLimit]);

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
  
  // Format gain values appropriately
  const formatGain = (value, metric) => {
    if (value === undefined || value === null) return '';
    
    // Handle experience or large numbers by formatting with commas
    if (metric?.includes('exp') || value > 10000) {
      return value.toLocaleString();
    }
    
    // Handle small values (like boss kills) as integers
    return Math.floor(value).toString();
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
                  <tr key={event.id} className={`ui-event-row ui-event-active ${event.is_wom ? 'ui-event-wom' : ''}`}>
                    <td>
                      <strong className="ui-event-name">
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
                  <tr key={event.id} className={`ui-event-row ui-event-upcoming ${event.is_wom ? 'ui-event-wom' : ''}`}>
                    <td>
                      <strong className="ui-event-name">
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
                  <tr key={event.id} className={`ui-event-row ui-event-completed ${event.is_wom ? 'ui-event-wom' : ''}`}>
                    <td>
                      <strong className="ui-event-name">
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
