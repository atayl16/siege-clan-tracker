import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './EventManagement.css';
import EventEditor from './EventEditor';
import WomEventsSyncButton from './WomEventsSyncButton'; // Import the new component

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
      return 'In Progress';
    }
  };

  const formatEventType = (event) => {
    if (event.is_wom) return "WOM Competition";
    
    // Convert event type to Title Case (capitalize first letter of each word)
    return toTitleCase(event.type || "Custom");
  };

  if (loading && events.length === 0) {
    return <div className="loading-spinner">Loading Events...</div>;
  }

  return (
    <div className="event-management">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="event-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            setIsCreatingEvent(!isCreatingEvent);
            setEditingEvent(null); // Close edit mode when toggling create
          }}
          disabled={editingEvent !== null} // Disable when editing
        >
          {isCreatingEvent ? "Cancel" : "Create New Event"}
        </button>
        <WomEventsSyncButton />
      </div>

      {isCreatingEvent && (
        <EventEditor
          onSave={handleEventSave}
          onCancel={() => setIsCreatingEvent(false)}
        />
      )}

      {editingEvent && (
        <div className="editing-container">
          <h4>Edit Event</h4>
          <EventEditor
            event={editingEvent} // Pass the event to edit
            onSave={handleEventSave}
            onCancel={handleCancelEdit}
            isEditing={true} // Flag to indicate edit mode
          />
        </div>
      )}

      <div className="events-table-container">
        <h4>Upcoming and Recent Events</h4>
        {events.length === 0 ? (
          <p>No events found. Create a new event or sync with WOM.</p>
        ) : (
          <table className="table table-dark table-hover">
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
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={
                    event.is_wom ? "wom-event-row" : "custom-event-row"
                  }
                >
                  <td>{toTitleCase(event.name)}</td>
                  <td>{formatEventType(event)}</td>
                  <td>{formatDate(event.start_date)}</td>
                  <td>{formatDate(event.end_date)}</td>
                  <td>{getEventStatus(event)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info edit-btn"
                      onClick={() => handleEditEvent(event)}
                      disabled={event.is_wom} // Disable editing for WOM events
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
