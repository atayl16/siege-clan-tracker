import React, { useState, useEffect } from 'react';
import { useEvents } from '../hooks/useEvents'; // Updated to use new hook
import { FaCalendar, FaClock, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

// Import UI components
import Button from './ui/Button';
import './EventEditor.css';

export default function EventEditor({
  event,
  onSave,
  onCancel,
  isEditing = false,
}) {
  const [eventData, setEventData] = useState({
    name: event?.name || "",
    type: event?.type || "bingo",
    start_date: event?.start_date || "",
    end_date: event?.end_date || "",
    is_wom: event?.is_wom || false,
    description: event?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userTimezone, setUserTimezone] = useState("");

  // Get refreshEvents function from the new hook
  const { refreshEvents } = useEvents();

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);

    if (!event?.start_date && !event?.end_date) {
      const today = new Date();
      today.setHours(20, 0, 0, 0); // 8:00 PM

      const endTime = new Date(today);
      endTime.setHours(22, 0, 0, 0); // 10:00 PM

      setEventData((prev) => ({
        ...prev,
        start_date: today.toISOString(),
        end_date: endTime.toISOString(),
      }));
    }
  }, [event]);

  const getHourFromISOString = (isoString) => {
    if (!isoString) return 20;
    const date = new Date(isoString);
    return date.getHours();
  };

  const getMinuteFromISOString = (isoString) => {
    if (!isoString) return 0;
    const date = new Date(isoString);
    return date.getMinutes();
  };

  const formatTime = (dateString) => {
    if (!dateString) return "None";
    try {
      const date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch (err) {
      console.error("Error formatting time:", err);
      return "Invalid time";
    }
  };

  const setTime = (fieldName, hour, minute) => {
    try {
      const currentDate = new Date(eventData[fieldName] || new Date());
      currentDate.setHours(hour, minute, 0, 0);
      setEventData({
        ...eventData,
        [fieldName]: currentDate.toISOString(),
      });
    } catch (err) {
      console.error("Error in setTime:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "start_date" || name === "end_date") {
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const minutes = date.getMinutes();
          const roundedMinutes = Math.round(minutes / 15) * 15;
          date.setMinutes(roundedMinutes, 0, 0);

          const formattedDate = date.toISOString().slice(0, 16);

          setEventData({
            ...eventData,
            [name]: formattedDate,
          });
          return;
        }
      }
    }

    setEventData({
      ...eventData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!eventData.name.trim() || !eventData.start_date || !eventData.end_date) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const startDate = roundDateToInterval(
        new Date(eventData.start_date)
      ).toISOString();
      const endDate = roundDateToInterval(
        new Date(eventData.end_date)
      ).toISOString();

      const updatedEvent = isEditing
        ? {
            ...eventData,
            id: event.id,
            start_date: startDate,
            end_date: endDate,
          }
        : {
            name: eventData.name,
            type: eventData.type,
            start_date: startDate,
            end_date: endDate,
            is_wom: false,
            description: eventData.description,
            status: "upcoming",
          };

      onSave(updatedEvent);
    } catch (err) {
      console.error(`Error preparing event:`, err);
      setError(`Failed to prepare event data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const roundDateToInterval = (date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes, 0, 0);
    return newDate;
  };

  return (
    <div className="ui-event-editor">
      <h3 className="ui-section-title">
        <FaCalendar className="ui-icon-left" />
        {isEditing ? "Edit Event" : "Create New Event"}
      </h3>

      {error && (
        <div className="ui-message ui-message-error">
          <FaExclamationTriangle className="ui-message-icon" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-event-form">
        {/* Form fields for event details */}
        {/* ... */}
        <div className="ui-form-actions">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            icon={<FaCheck />}
          >
            {saving ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
