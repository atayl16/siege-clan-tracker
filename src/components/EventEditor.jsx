import React, { useState, useEffect } from 'react';
import { useEvents } from '../context/DataContext';
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
  
  // Get refreshEvents function from context
  const { refreshEvents } = useEvents();

  // Fix the useEffect that sets default times
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  
    // Only set default times if no times are already provided
    if (!event?.start_date && !event?.end_date) {
      // Create today's date at 8:00 PM local time
      const today = new Date();
      today.setHours(20, 0, 0, 0); // 8:00 PM
  
      // Create end time 2 hours later (10:00 PM)
      const endTime = new Date(today);
      endTime.setHours(22, 0, 0, 0);
  
      setEventData(prev => ({
        ...prev,
        start_date: today.toISOString(),
        end_date: endTime.toISOString()
      }));
    }
  }, [event]);
  
  // Fix the time display and manipulation functions
  const getHourFromISOString = (isoString) => {
    if (!isoString) return 20; // Default to 8:00 PM
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
  
  // Fix the setTime function
  const setTime = (fieldName, hour, minute) => {
    try {
      const currentDate = new Date(eventData[fieldName] || new Date());
      currentDate.setHours(hour, minute, 0, 0);
      setEventData({
        ...eventData,
        [fieldName]: currentDate.toISOString()
      });
    } catch (err) {
      console.error("Error in setTime:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For datetime fields, ensure we snap to 15-minute intervals
    if (name === "start_date" || name === "end_date") {
      // Only process if there's a value
      if (value) {
        const date = new Date(value);

        // Only snap if this is a valid date
        if (!isNaN(date.getTime())) {
          const minutes = date.getMinutes();
          // Round to nearest 15 minutes
          const roundedMinutes = Math.round(minutes / 15) * 15;
          date.setMinutes(roundedMinutes, 0, 0);

          // Format back to datetime-local format
          const formattedDate = date.toISOString().slice(0, 16);

          setEventData({
            ...eventData,
            [name]: formattedDate,
          });
          return;
        }
      }
    }

    // For other fields or if we couldn't process the date
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
  
      // Ensure times are aligned to 15-minute intervals before saving
      const startDate = roundDateToInterval(
        new Date(eventData.start_date)
      ).toISOString();
      const endDate = roundDateToInterval(
        new Date(eventData.end_date)
      ).toISOString();
  
      // Build the event object but DON'T save it directly from this component
      const updatedEvent = isEditing
        ? {
            ...eventData,
            id: event.id,
            start_date: startDate,
            end_date: endDate
          }
        : {
            name: eventData.name,
            type: eventData.type,
            start_date: startDate,
            end_date: endDate,
            is_wom: false, // Custom events are never WOM events
            description: eventData.description,
            status: "upcoming",
          };
  
      // Pass the event data to the parent WITHOUT saving here
      onSave(updatedEvent);
      
      // Don't call refreshEvents() here - let the parent handle any refreshing
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
        <div className="ui-form-group">
          <label htmlFor="event-name" className="ui-form-label">
            Event Name*
          </label>
          <input
            type="text"
            id="event-name"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            className="ui-form-input"
            required
            placeholder="e.g., Clan Bingo April 2025"
          />
        </div>

        <div className="ui-form-group">
          <label htmlFor="event-type" className="ui-form-label">
            Event Type
          </label>
          <select
            id="event-type"
            name="type"
            value={eventData.type}
            onChange={handleChange}
            className="ui-form-select"
          >
            <option value="bingo">Bingo</option>
            <option value="skilling">Skilling</option>
            <option value="bossing">Bossing</option>
            <option value="raids">Raids</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label htmlFor="start-date" className="ui-form-label">
                <FaCalendar className="ui-icon-left" /> Start Date*
              </label>
              <input
                type="date"
                id="start-date"
                name="start_date"
                value={
                  eventData.start_date
                    ? eventData.start_date.substring(0, 10)
                    : ""
                }
                onChange={(e) => {
                  // Preserve the time part when changing just the date
                  const timePart = eventData.start_date
                    ? eventData.start_date.substring(11, 16)
                    : "00:00";
                  const newValue = `${e.target.value}T${timePart}`;
                  setEventData({
                    ...eventData,
                    start_date: newValue,
                  });
                }}
                className="ui-form-input"
                required
              />
            </div>

            <div className="ui-form-group">
              <label htmlFor="start-time" className="ui-form-label">
                <FaClock className="ui-icon-left" /> Start Time*
                <span className="ui-timezone-label">({userTimezone})</span>
              </label>
              <div className="ui-time-picker">
                <div className="ui-time-picker-row">
                  <div className="ui-time-picker-column">
                    <label className="ui-time-label">Hour</label>
                    <select
                      className="ui-time-select"
                      value={getHourFromISOString(eventData.start_date)}
                      onChange={(e) => {
                        const hour = parseInt(e.target.value, 10);
                        setTime(
                          "start_date",
                          hour,
                          getMinuteFromISOString(eventData.start_date)
                        );
                      }}
                    >
                      {[...Array(24).keys()].map((hour) => (
                        <option key={hour} value={hour}>
                          {hour.toString().padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ui-time-colon">:</div>
                  <div className="ui-time-picker-column">
                    <label className="ui-time-label">Minute</label>
                    <select
                      className="ui-time-select"
                      value={getMinuteFromISOString(eventData.start_date)}
                      onChange={(e) => {
                        const minute = parseInt(e.target.value, 10);
                        setTime(
                          "start_date",
                          getHourFromISOString(eventData.start_date),
                          minute
                        );
                      }}
                    >
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>
                <div className="ui-selected-time">
                  Current selection:{" "}
                  <strong>{formatTime(eventData.start_date)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="ui-form-col">
            <div className="ui-form-group">
              <label htmlFor="end-date" className="ui-form-label">
                <FaCalendar className="ui-icon-left" /> End Date*
              </label>
              <input
                type="date"
                id="end-date"
                name="end_date"
                value={
                  eventData.end_date ? eventData.end_date.substring(0, 10) : ""
                }
                onChange={(e) => {
                  // Preserve the time part when changing just the date
                  const timePart = eventData.end_date
                    ? eventData.end_date.substring(11, 16)
                    : "00:00";
                  const newValue = `${e.target.value}T${timePart}`;
                  setEventData({
                    ...eventData,
                    end_date: newValue,
                  });
                }}
                className="ui-form-input"
                required
              />
            </div>

            <div className="ui-form-group">
              <label htmlFor="end-time" className="ui-form-label">
                <FaClock className="ui-icon-left" /> End Time*
                <span className="ui-timezone-label">({userTimezone})</span>
              </label>
              <div className="ui-time-picker">
                <div className="ui-time-picker-row">
                  <div className="ui-time-picker-column">
                    <label className="ui-time-label">Hour</label>
                    <select
                      className="ui-time-select"
                      value={getHourFromISOString(eventData.end_date)}
                      onChange={(e) => {
                        const hour = parseInt(e.target.value, 10);
                        setTime(
                          "end_date",
                          hour,
                          getMinuteFromISOString(eventData.end_date)
                        );
                      }}
                    >
                      {[...Array(24).keys()].map((hour) => (
                        <option key={hour} value={hour}>
                          {hour.toString().padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ui-time-colon">:</div>
                  <div className="ui-time-picker-column">
                    <label className="ui-time-label">Minute</label>
                    <select
                      className="ui-time-select"
                      value={getMinuteFromISOString(eventData.end_date)}
                      onChange={(e) => {
                        const minute = parseInt(e.target.value, 10);
                        setTime(
                          "end_date",
                          getHourFromISOString(eventData.end_date),
                          minute
                        );
                      }}
                    >
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>

                <div className="ui-time-presets">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Create a new Date from the start date
                      const startDate = new Date(eventData.start_date);

                      // Create end time exactly 1 hour after start time
                      const endDate = new Date(startDate);
                      endDate.setHours(endDate.getHours() + 2);

                      // Update only the end date
                      setEventData((prev) => ({
                        ...prev,
                        end_date: endDate.toISOString(),
                      }));
                    }}
                  >
                    2-Hour Event
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Create a new Date from the start date
                      const startDate = new Date(eventData.start_date);

                      // Create a new end date exactly one week later
                      const endDate = new Date(startDate);
                      endDate.setDate(endDate.getDate() + 7);

                      // Update only the end date
                      setEventData((prev) => ({
                        ...prev,
                        end_date: endDate.toISOString(),
                      }));
                    }}
                  >
                    1-Week Event
                  </Button>
                </div>

                <div className="ui-selected-time">
                  Current selection:{" "}
                  <strong>{formatTime(eventData.end_date)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-timezone-note">
          <small>All times are in your local timezone ({userTimezone})</small>
        </div>

        <div className="ui-form-group">
          <label htmlFor="description" className="ui-form-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={eventData.description}
            onChange={handleChange}
            className="ui-form-textarea"
            rows="3"
            placeholder="Enter event details, requirements, or instructions"
          ></textarea>
        </div>

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
