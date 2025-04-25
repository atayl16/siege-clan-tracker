import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FaEdit, FaTrash, FaCalendarPlus, FaSync, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

// Import UI components
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import EmptyState from './ui/EmptyState';
import DataTable from './ui/DataTable';
import Badge from './ui/Badge';

import EventEditor from './EventEditor';
import WomSyncButton from './WomSyncButton';

import './EventManagement.css';

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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Active':
        return <Badge variant="success">{status}</Badge>;
      case 'Upcoming':
        return <Badge variant="info">{status}</Badge>;
      case 'Completed':
        return <Badge variant="secondary">{status}</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  // Define columns for the events table
  const eventColumns = [
    {
      header: 'Event Name',
      accessor: 'name',
      render: (event) => {
        return (
          <div className="ui-event-name">
            {event.name}
            {event.is_wom && <span className="ui-event-tag">WOM</span>}
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (event) => formatEventType(event)
    },
    {
      header: 'Start Date',
      accessor: 'start_date',
      render: (event) => formatDate(event.start_date)
    },
    {
      header: 'End Date',
      accessor: 'end_date',
      render: (event) => formatDate(event.end_date)
    },
    {
      header: 'Status',
      render: (event) => getStatusBadge(getEventStatus(event))
    },
    {
      header: 'Actions',
      render: (event) => (
        <div className="ui-event-actions">
          {!event.is_wom && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<FaEdit />}
                onClick={() => handleEditEvent(event)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<FaTrash />}
                onClick={() => handleDeleteClick(event)}
              >
                Delete
              </Button>
            </>
          )}
          {event.is_wom && (
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
        </div>
      )
    }
  ];

  if (loading && events.length === 0) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading events data...</div>
      </div>
    );
  }

  return (
    <div className="ui-event-management">
      {error && (
        <div className="ui-message ui-message-error">
          <FaExclamationTriangle className="ui-message-icon" />
          <span>{error}</span>
        </div>
      )}

      <Modal 
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Deletion"
      >
        <div className="ui-delete-confirm">
          <p>
            Are you sure you want to delete the event{" "}
            <strong>{deleteConfirm?.name}</strong>?
          </p>
          <p className="ui-delete-warning">This action cannot be undone.</p>

          <Modal.Footer>
            <Button
              variant="danger"
              onClick={handleDeleteEvent}
              icon={<FaTrash />}
            >
              Delete Event
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Card className="ui-event-tools" variant="dark">
        <Card.Body>
          <div className="ui-event-actions">
            <Button
              variant="primary"
              onClick={() => {
                setIsCreatingEvent(!isCreatingEvent);
                setEditingEvent(null);
              }}
              disabled={editingEvent !== null}
              icon={<FaCalendarPlus />}
            >
              {isCreatingEvent ? "Cancel" : "Create Event"}
            </Button>
            <Button 
              variant="secondary"
              onClick={fetchEvents}
              icon={<FaSync />}
            >
              Refresh
            </Button>
          </div>
        </Card.Body>
      </Card>

      {isCreatingEvent && (
        <Card className="ui-event-editor-container" variant="dark">
          <Card.Body>
            <EventEditor
              onSave={handleEventSave}
              onCancel={() => setIsCreatingEvent(false)}
            />
          </Card.Body>
        </Card>
      )}

      {editingEvent && (
        <Card className="ui-event-editor-container" variant="dark">
          <Card.Body>
            <EventEditor
              event={editingEvent}
              onSave={handleEventSave}
              onCancel={handleCancelEdit}
              isEditing={true}
            />
          </Card.Body>
        </Card>
      )}

      <Card className="ui-events-table-container" variant="dark">
        <Card.Header className="ui-events-table-header">
          <h3 className="ui-section-title">
            <FaCalendarAlt className="ui-icon-left" /> Event Calendar
          </h3>
        </Card.Header>
        
        <Card.Body>
          {events.length === 0 ? (
            <EmptyState
              title="No Events Found"
              description="Create a new event or sync with Wise Old Man."
              icon={<FaCalendarAlt className="ui-empty-state-icon" />}
              action={
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsCreatingEvent(true);
                    setEditingEvent(null);
                  }}
                  icon={<FaCalendarPlus />}
                >
                  Create Event
                </Button>
              }
            />
          ) : (
            <DataTable
              columns={eventColumns}
              data={events}
              keyField="id"
              emptyMessage="No events found"
              className="ui-events-table"
            />
          )}
        </Card.Body>
      </Card>

      <Card className="ui-event-sync-section" variant="dark">
        <Card.Header>
          <h3 className="ui-section-title">
            <FaSync className="ui-icon-left" /> Data Synchronization
          </h3>
        </Card.Header>
        
        <Card.Body>
          <p className="ui-section-description">
            Import competitions and events from Wise Old Man
          </p>
          
          <div className="ui-sync-button-container">
            <WomSyncButton
              type="events"
              buttonText="Sync WOM Competitions"
              onSyncComplete={fetchEvents}
            />
          </div>
          
          <p className="ui-sync-note">
            Sync will import all WOM competitions your clan is participating in.
            These events are read-only and cannot be edited.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}
