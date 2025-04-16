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
      
      console.log("Events data:", data); // Debug log
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
      setEvents(events.map(event => 
        event.id === savedEvent.id ? savedEvent : event
      ));
      setEditingEvent(null);
    } else {
      setEvents([savedEvent, ...events]);
      setIsCreatingEvent(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setIsCreatingEvent(false);
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

  const formatEventType = (event) => {
    if (event.is_wom) return "WOM";
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
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #333' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    Event Name
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    Type
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    Start Date
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    End Date
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    Status
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #444', backgroundColor: '#2a2a2a', color: '#ddd' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <tr key={event.id} style={{ backgroundColor: event.is_wom ? 'rgba(0, 123, 255, 0.05)' : 'rgba(40, 167, 69, 0.05)' }}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#f4f4f8' }}>
                        {toTitleCase(event.name)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#f4f4f8' }}>
                        {formatEventType(event)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#ddd' }}>
                        {formatDate(event.start_date)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#ddd' }}>
                        {formatDate(event.end_date)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem',
                          backgroundColor: status === 'Active' ? 'rgba(40, 167, 69, 0.2)' : 
                                          status === 'Upcoming' ? 'rgba(0, 123, 255, 0.2)' : 
                                          'rgba(108, 117, 125, 0.2)',
                          color: status === 'Active' ? '#28a745' : 
                                 status === 'Upcoming' ? '#007bff' : 
                                 '#6c757d'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                        {!event.is_wom ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleEditEvent(event)}
                              style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}
                              title="Edit event"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(event)}
                              style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}
                              title="Delete event"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a 
                              href={`https://wiseoldman.net/competitions/${event.wom_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                background: 'rgba(23, 162, 184, 0.15)', 
                                color: '#17a2b8', 
                                border: 'none', 
                                borderRadius: '4px', 
                                padding: '4px 8px', 
                                fontSize: '0.85rem', 
                                cursor: 'pointer',
                                textDecoration: 'none'
                              }}
                              title="View in Wise Old Man"
                            >
                              <FaEdit style={{ marginRight: '4px' }} /> Edit in WOM
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
