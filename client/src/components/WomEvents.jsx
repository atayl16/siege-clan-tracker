import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './WomEvents.css';

export default function WomEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch both WOM events and custom events from Supabase
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (event) => {
    const now = new Date();
    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    if (!startDate || !endDate) return <span className="badge bg-secondary">Unknown</span>;
    
    if (now < startDate) {
      return <span className="badge bg-info">Upcoming</span>;
    } else if (now > endDate) {
      return <span className="badge bg-success">Completed</span>;
    } else {
      return <span className="badge bg-warning">In Progress</span>;
    }
  };

  if (loading) return <div className="loading-spinner">Loading events...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  
  return (
    <div className="wom-events">
      <h3>Clan Events</h3>
      
      {events.length === 0 ? (
        <p className="no-events">No events found</p>
      ) : (
        <div className="events-table-container">
          <table className="table table-dark table-hover">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className={event.is_wom ? "wom-event-row" : "custom-event-row"}>
                  <td>{event.name}</td>
                  <td>{event.is_wom ? "WOM" : "Custom"}</td>
                  <td>{formatDate(event.start_date)}</td>
                  <td>{formatDate(event.end_date)}</td>
                  <td>{getStatusBadge(event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
