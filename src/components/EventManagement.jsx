import React, { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { 
  FaEdit, 
  FaExclamationTriangle, 
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaHourglass,
  FaExternalLinkAlt // Added external link icon
} from 'react-icons/fa';

// Import UI components
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';
import EventEditor from './EventEditor';
import './EventManagement.css';

export default function EventManagement() {
  const [editingEvent, setEditingEvent] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Use the events hook
  const { 
    events, 
    loading, 
    error: fetchError, 
    refreshEvents, 
    updateEvent
  } = useEvents();

  const handleEventSave = async (savedEvent) => {
    try {
      setActionError(null);
      
      // Update existing event
      await updateEvent(savedEvent);
      setEditingEvent(null);

      // Refresh events data
      refreshEvents();
    } catch (err) {
      console.error("Error saving event:", err);
      setActionError(`Failed to save event: ${err.message}`);
    }
  };

  // Helper function to format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    
    const dateFormatted = date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const timeFormatted = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return (
      <div className="ui-event-datetime">
        <div className="ui-event-date">
          <FaCalendarAlt className="ui-event-icon" /> {dateFormatted}
        </div>
        <div className="ui-event-time">
          <FaClock className="ui-event-icon" /> {timeFormatted}
        </div>
      </div>
    );
  };

  // Helper function to format event type
  const formatEventType = (type) => {
    const typeMap = {
      bingo: "Bingo",
      competition: "Competition",
      meeting: "Meeting",
      pvm: "PvM Event",
      social: "Social",
      other: "Other"
    };
    
    return typeMap[type] || type;
  };

  // Helper function to determine event status
  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (now < startDate) {
      return { label: "Upcoming", variant: "warning", icon: <FaHourglass /> };
    } else if (now >= startDate && now <= endDate) {
      return { label: "In Progress", variant: "success", icon: <FaClock /> };
    } else {
      return { label: "Completed", variant: "secondary", icon: <FaCheck /> };
    }
  };

  if (loading && (!events || events.length === 0)) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading events data...</div>
      </div>
    );
  }

  return (
    <div className="ui-event-management">
      {(fetchError || actionError) && (
        <div className="ui-message ui-message-error">
          <FaExclamationTriangle className="ui-message-icon" />
          <span>{actionError || fetchError.message || String(fetchError)}</span>
        </div>
      )}

      {/* Event editing modal */}
      <Modal
        isOpen={editingEvent !== null}
        onClose={() => setEditingEvent(null)}
        title="Edit Event"
        size="large"
      >
        {editingEvent && (
          <EventEditor
            event={editingEvent}
            onSave={handleEventSave}
            onCancel={() => setEditingEvent(null)}
            isEditing={true}
          />
        )}
      </Modal>

      <Card className="ui-events-table-container" variant="dark">
        <Card.Header className="ui-events-table-header">
          <h3 className="ui-section-title">
            <FaCalendarAlt className="ui-icon-left" /> Event Calendar
          </h3>
        </Card.Header>
        
        <Card.Body>
          {!events || events.length === 0 ? (
            <EmptyState
              title="No Events Found"
              description="No events are currently scheduled."
              icon={<FaCalendarAlt className="ui-empty-state-icon" />}
            />
          ) : (
            <table className="ui-events-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td>
                      <div className="ui-event-name">
                        {event.name}
                        {event.is_wom && (
                          <Badge variant="info" className="ui-event-tag">
                            WOM
                          </Badge>
                        )}
                        <div className="ui-event-status">
                          {(() => {
                            const status = getEventStatus(event);
                            return (
                              <Badge variant={status.variant} className="ui-status-badge">
                                {status.icon} {status.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td>{formatEventType(event.type)}</td>
                    <td>{formatDateTime(event.start_date)}</td>
                    <td>{formatDateTime(event.end_date)}</td>
                    <td>
                      <div className="ui-event-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingEvent(event)}
                          icon={<FaEdit />}
                          className="ui-action-button"
                          title="Edit Event"
                        >
                          Edit
                        </Button>
                        
                        {/* Add WiseOldMan edit button only for WOM events */}
                        {event.is_wom && event.wom_id && (
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => window.open(`https://wiseoldman.net/competitions/${event.wom_id}/edit`, '_blank')}
                            icon={<FaExternalLinkAlt />}
                            className="ui-action-button"
                            title="Edit in WiseOldMan"
                          >
                            WOM
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
