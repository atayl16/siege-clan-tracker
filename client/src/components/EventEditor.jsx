import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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

  // Detect user's timezone on component mount
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);

    // Set default start/end times with 15-minute intervals
    const now = new Date();

    // Round minutes to next 15-minute interval
    const mins = now.getMinutes();
    const roundedMins = Math.ceil(mins / 15) * 15;
    now.setMinutes(roundedMins, 0, 0);

    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const startTime = now.toISOString().slice(0, 16);

    // End time is 2 hours after start time
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    // Set default times in state
    setEventData((prev) => ({
      ...prev,
      start_date: startTime,
      end_date: endTime,
    }));
  }, []);

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

      // Ensure times are aligned to 15-minute intervals before saving
      const startDate = roundDateToInterval(
        new Date(eventData.start_date)
      ).toISOString();
      const endDate = roundDateToInterval(
        new Date(eventData.end_date)
      ).toISOString();

      if (isEditing) {
        // Update existing event
        const { data, error: updateError } = await supabase
          .from("events")
          .update({
            name: eventData.name,
            type: eventData.type,
            start_date: startDate,
            end_date: endDate,
            description: eventData.description,
          })
          .eq("id", event.id) // Update where id matches
          .select();

        if (updateError) throw updateError;

        // Call the parent component's onSave function with the updated event
        onSave(data[0]);
      } else {
        // Insert new event
        const { data, error: insertError } = await supabase
          .from("events")
          .insert([
            {
              name: eventData.name,
              type: eventData.type,
              start_date: startDate,
              end_date: endDate,
              is_wom: false, // Custom events are never WOM events
              description: eventData.description,
              status: "upcoming",
            },
          ])
          .select();

        if (insertError) throw insertError;

        // Call the parent component's onSave function with the saved event
        onSave(data[0]);
      }
    } catch (err) {
      console.error(`Error ${isEditing ? "updating" : "saving"} event:`, err);
      setError(
        `Failed to ${isEditing ? "update" : "save"} event: ${err.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  // Helper function to round a date to the nearest 15-minute interval
  const roundDateToInterval = (date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes, 0, 0);
    return newDate;
  };

  // Replace the existing setTime function and related code

  // Time selector handlers
  const setTime = (fieldName, hour, minute) => {
    try {
      // Get current ISO date string from state
      const currentDateStr = eventData[fieldName] || new Date().toISOString();

      // Extract just the date part (YYYY-MM-DD)
      const datePart = currentDateStr.substring(0, 10);

      // Manually construct a new ISO string with the exact hour/minute
      // This bypasses any timezone conversions
      const newTimeStr = `${datePart}T${hour
        .toString()
        .padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00.000Z`;

      // Log for debugging
      console.log(`Setting ${fieldName} to ${hour}:${minute} => ${newTimeStr}`);

      // Update state with the new string
      setEventData({
        ...eventData,
        [fieldName]: newTimeStr,
      });
    } catch (err) {
      console.error("Error in setTime:", err);
    }
  };

  // Update these functions to handle timezone conversion correctly

  // Get hour and minute values directly from ISO string instead of using Date
  const getHourFromISOString = (isoString) => {
    if (!isoString) return 12; // Default
    // For ISO strings that end with Z (UTC), we need to extract the hour directly
    if (isoString.endsWith("Z")) {
      return parseInt(isoString.substring(11, 13), 10);
    }
    // Otherwise use substring for local time strings
    return parseInt(isoString.substring(11, 13), 10);
  };

  const getMinuteFromISOString = (isoString) => {
    if (!isoString) return 0; // Default
    // For ISO strings that end with Z (UTC), we need to extract the minute directly
    if (isoString.endsWith("Z")) {
      return parseInt(isoString.substring(14, 16), 10);
    }
    // Otherwise use substring for local time strings
    return parseInt(isoString.substring(14, 16), 10);
  };

  // Format time for display directly from ISO string
  const formatTime = (dateString) => {
    if (!dateString) return "None";
    try {
      // Extract hours and minutes directly from the ISO string
      const hours = getHourFromISOString(dateString);
      const minutes = getMinuteFromISOString(dateString);

      // Format in 12-hour format with AM/PM
      const period = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch (err) {
      console.error("Error formatting time:", err);
      return "Invalid time";
    }
  };

  return (
    <div className="event-editor">
      <h3>Create New Event</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="event-name">Event Name*</label>
          <input
            type="text"
            id="event-name"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            className="form-control"
            required
            placeholder="e.g., Clan Bingo April 2025"
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-type">Event Type</label>
          <select
            id="event-type"
            name="type"
            value={eventData.type}
            onChange={handleChange}
            className="form-control"
          >
            <option value="skilling">Skilling</option>
            <option value="bossing">Bossing</option>
            <option value="raids">Raids</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group col-md-6">
            <label htmlFor="start-date">Start Date*</label>
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
              className="form-control"
              required
            />

            <label htmlFor="start-time" className="mt-2">
              Start Time* <small>({userTimezone})</small>
            </label>
            <div className="compact-time-picker">
              <div className="time-picker-row">
                <div className="time-picker-column">
                  <label>Hour</label>
                  <select
                    className="time-select"
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
                <div className="time-colon">:</div>
                <div className="time-picker-column">
                  <label>Minute</label>
                  <select
                    className="time-select"
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
              <div className="selected-time">
                Current selection:{" "}
                <strong>{formatTime(eventData.start_date)}</strong>
              </div>
            </div>
          </div>

          <div className="form-group col-md-6">
            <label htmlFor="end-date">End Date*</label>
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
              className="form-control"
              required
            />

            <label htmlFor="end-time" className="mt-2">
              End Time* <small>({userTimezone})</small>
            </label>
            <div className="compact-time-picker">
              <div className="time-picker-row">
                <div className="time-picker-column">
                  <label>Hour</label>
                  <select
                    className="time-select"
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
                <div className="time-colon">:</div>
                <div className="time-picker-column">
                  <label>Minute</label>
                  <select
                    className="time-select"
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

              <div className="time-presets">
                <button
                  type="button"
                  className="preset-button"
                  onClick={() => {
                    // Set to 1 hour after start time
                    const startDate = new Date(
                      eventData.start_date || new Date()
                    );
                    const endDate = new Date(
                      startDate.getTime() + 1 * 60 * 60 * 1000
                    );
                    setEventData({
                      ...eventData,
                      end_date: endDate.toISOString().slice(0, 16),
                    });
                  }}
                >
                  + 1 hour
                </button>

                <button
                  type="button"
                  className="preset-button"
                  onClick={() => {
                    // Set to 1 week after start time
                    const startDate = new Date(
                      eventData.start_date || new Date()
                    );
                    const endDate = new Date(
                      startDate.getTime() + 7 * 24 * 60 * 60 * 1000
                    );
                    setEventData({
                      ...eventData,
                      end_date: endDate.toISOString().slice(0, 16),
                    });
                  }}
                >
                  + 1 week
                </button>

                <button
                  type="button"
                  className="preset-button"
                  onClick={() => {
                    // Set to 8:00 PM
                    const date = new Date(eventData.end_date || new Date());
                    date.setHours(20, 0, 0, 0);
                    setEventData({
                      ...eventData,
                      end_date: date.toISOString().slice(0, 16),
                    });
                  }}
                >
                  8:00 PM
                </button>
              </div>

              <div className="selected-time">
                Current selection:{" "}
                <strong>{formatTime(eventData.end_date)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="timezone-note">
          <small>All times are in your local timezone ({userTimezone})</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={eventData.description}
            onChange={handleChange}
            className="form-control"
            rows="3"
            placeholder="Enter event details, requirements, or instructions"
          ></textarea>
        </div>

        <div className="button-group">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
