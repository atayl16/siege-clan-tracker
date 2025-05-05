import React, { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { FaEdit, FaTrash, FaCalendarPlus, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

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

  // Add the missing handleDeleteEvent function
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
        </div>
      ),
    },
    {
      accessor: 'type',
      Header: 'Type',
      Cell: ({ value }) => <span className="ui-event-type">{value}</span>,
    },
    {
      accessor: 'start_date',
      Header: 'Start Date',
      Cell: ({ value }) => (
        <span className="ui-event-date">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      accessor: 'end_date',
      Header: 'End Date',
      Cell: ({ value }) => (
        <span className="ui-event-date">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
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
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteConfirm(row.original)}
            icon={<FaTrash />}
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
