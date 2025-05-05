import React, { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { 
  FaEdit, 
  FaTrash, 
  FaCalendarPlus, 
  FaExclamationTriangle, 
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaHourglass
} from 'react-icons/fa';

// Import UI components
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import EmptyState from './ui/EmptyState';
import DataTable from './ui/DataTable';
import Badge from './ui/Badge';
import EventEditor from './EventEditor';
import './EventManagement.css';

export default function EventManagement() {
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Use the events hook
  const { 
    events, 
    loading, 
    error: fetchError, 
    refreshEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
  } = useEvents();

  const handleEventSave = async (savedEvent) => {
    try {
      setActionError(null);

      if (editingEvent) {
        // Use the new hook's update method
        await updateEvent(savedEvent);
        setEditingEvent(null);
      } else {
        // Create new event
        const { id, _tempId, ...eventData } = savedEvent;

        // Extract only the fields that exist in the database schema
        const eventToInsert = {
          name: eventData.name,
          type: eventData.type,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          is_wom: eventData.is_wom || false,
          description: eventData.description || "",
          status: eventData.status || "upcoming",
        };

        // Use the new hook's create method
        await createEvent(eventToInsert);
        setIsCreatingEvent(false);
      }

      // Refresh events data
      refreshEvents();
    } catch (err) {
      console.error("Error saving event:", err);
      setActionError(`Failed to save event: ${err.message}`);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      setActionError(null);
      
      if (!deleteConfirm || !deleteConfirm.id) {
        setActionError("Cannot delete event: Missing event ID");
        return;
      }
      
      // Use the deleteEvent function from the hook
      await deleteEvent(deleteConfirm.id);
      
      // Clear the delete confirmation
      setDeleteConfirm(null);
      
      // Refresh events data
      refreshEvents();
      
    } catch (err) {
      console.error("Error deleting event:", err);
      setActionError(`Failed to delete event: ${err.message}`);
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

  // Define event columns for the data table
  const eventColumns = [
    {
      accessor: 'name',
      Header: 'Event Name',
      Cell: ({ row }) => (
        <div className="ui-event-name">
          {row.original.name}
          {row.original.is_wom && (
            <Badge variant="info" className="ui-event-tag">
              WOM
            </Badge>
          )}
          <div className="ui-event-status">
            {(() => {
              const status = getEventStatus(row.original);
              return (
                <Badge variant={status.variant} className="ui-status-badge">
                  {status.icon} {status.label}
                </Badge>
              );
            })()}
          </div>
        </div>
      ),
    },
    {
      accessor: 'type',
      Header: 'Type',
      Cell: ({ value }) => (
        <span className="ui-event-type">
          {formatEventType(value)}
        </span>
      ),
    },
    {
      accessor: 'start_date',
      Header: 'Starts',
      Cell: ({ value }) => formatDateTime(value),
    },
    {
      accessor: 'end_date',
      Header: 'Ends',
      Cell: ({ value }) => formatDateTime(value),
    },
    {
      accessor: 'actions',
      Header: 'Actions',
      Cell: ({ row }) => (
        <div className="ui-event-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditingEvent(row.original)}
            icon={<FaEdit />}
            className="ui-action-button"
            title="Edit Event"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteConfirm(row.original)}
            icon={<FaTrash />}
            className="ui-action-button"
            title="Delete Event"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

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

      {/* Delete confirmation modal */}
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
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Event creation modal */}
      <Modal
        isOpen={isCreatingEvent}
        onClose={() => setIsCreatingEvent(false)}
        title="Create New Event"
        size="large"
      >
        <EventEditor
          onSave={handleEventSave}
          onCancel={() => setIsCreatingEvent(false)}
        />
      </Modal>

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
          <div className="ui-event-actions">
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
          </div>
        </Card.Header>

        <Card.Body>
          {!events || events.length === 0 ? (
            <EmptyState
              title="No Events Found"
              description="Create a new event to get started."
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
              data={events || []}
              keyField="id"
              emptyMessage="No events found"
              className="ui-events-table"
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
