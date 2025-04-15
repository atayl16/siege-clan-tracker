import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './EventManagement.css';
import EventEditor from './EventEditor';
import WomSyncButton from './WomSyncButton';
import { FaEdit, FaTrash, FaCalendarPlus, FaSync } from 'react-icons/fa';

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSave = (savedEvent) => {
    if (editingEvent) {
      // Update the edited event in the list
      setEvents(events.map(event => 
        event.id === savedEvent.id ? savedEvent : event
      ));
      setEditingEvent(null); // Exit edit mode
    } else {
      // Add the new event to the list
      setEvents([savedEvent, ...events]);
      setIsCreatingEvent(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setIsCreatingEvent(false); // Close the create form if it's open
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
  };

  const handleDeleteClick = (event) => {
    setDeleteConfirm(event);
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirm) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteConfirm.id);
        
      if (error) throw error;
      
      // Remove from local state
      setEvents(events.filter(event => event.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(`Failed to delete event: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper function to convert text to title case
  const toTitleCase = (text) => {
    if (!text) return '';
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    if (!startDate || !endDate) return 'Unknown';
    
    if (now < startDate) {
      return 'Upcoming';
    } else if (now > endDate) {
      return 'Completed';
    } else {
      return 'Active';
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Active': return 'status-active';
      case 'Upcoming': return 'status-upcoming';
      case 'Completed': return 'status-completed';
      default: return '';
    }
  };

  const formatEventType = (event) => {
    if (event.is_wom) return "WOM Competition";
    return toTitleCase(event.type || "Custom");
  };

  if (loading && events.length === 0) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <div className="loading-text">Loading events data...</div>
    </div>;
  }

  return (
    <div className="event-management">
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="delete-confirm-content">
            <h4>Confirm Deletion</h4>
            <p>
              Are you sure you want to delete the event{" "}
              <strong>{deleteConfirm.name}</strong>?
            </p>
            <p className="warning">This action cannot be undone.</p>

            <div className="button-group">
              <button className="btn btn-danger" onClick={handleDeleteEvent}>
                Delete Event
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event button at top */}
      <div className="event-tools">
        <div className="event-actions">
          <button
            className="create-event-btn"
            onClick={() => {
              setIsCreatingEvent(!isCreatingEvent);
              setEditingEvent(null);
            }}
            disabled={editingEvent !== null}
          >
            <FaCalendarPlus className="btn-icon" />
            {isCreatingEvent ? "Cancel" : "Create Event"}
          </button>
        </div>
      </div>

      {isCreatingEvent && (
        <div className="event-editor-container">
          <EventEditor
            onSave={handleEventSave}
            onCancel={() => setIsCreatingEvent(false)}
          />
        </div>
      )}

      {editingEvent && (
        <div className="event-editor-container">
          <EventEditor
            event={editingEvent}
            onSave={handleEventSave}
            onCancel={handleCancelEdit}
            isEditing={true}
          />
        </div>
      )}

      <div className="events-table-container">
        <div className="table-header">
          <h3>Event Calendar</h3>
          <div className="table-actions">
            <button className="refresh-btn" onClick={fetchEvents}>
              <FaSync className="btn-icon" /> Refresh
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <p>
              No events found. Create a new event or sync with Wise Old Man.
            </p>
          </div>
        ) : (
          <table className="events-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <tr
                    key={event.id}
                    className={`event-row ${
                      event.is_wom ? "wom-event-row" : "custom-event-row"
                    }`}
                  >
                    <td className="event-name">
                      {toTitleCase(event.name)}
                      {event.is_wom && <span className="wom-badge">WOM</span>}
                    </td>
                    <td>{formatEventType(event)}</td>
                    <td>{formatDate(event.start_date)}</td>
                    <td>{formatDate(event.end_date)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusClass(status)}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {!event.is_wom && (
                        <>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditEvent(event)}
                            title="Edit event"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteClick(event)}
                            title="Delete event"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {event.is_wom && (
                        <span className="readonly-note">
                          WOM Event (read-only)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sync section moved to bottom */}
      <div className="event-sync-section">
        <div className="event-sync-header">
          <h3>Data Synchronization</h3>
        </div>
        <div className="event-sync-content">
          <p>Import competitions and events from Wise Old Man</p>
          <WomSyncButton 
            type="events"
            buttonText="Sync WOM Competitions"
            onSyncComplete={fetchEvents} 
          />
          <p className="event-sync-note">
            Sync will import all WOM competitions your clan is participating in.
            These events are read-only and cannot be edited.
          </p>
        </div>
      </div>
    </div>
  );
}
