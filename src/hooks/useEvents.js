import { useState, useEffect, useCallback } from 'react';
import { getAdminSupabaseClient } from '../utils/supabaseClient.js';

export function useEvents() {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the appropriate client based on admin status
      const client = getAdminSupabaseClient();
      
      const { data, error: fetchError } = await client
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new event
  const createEvent = async (eventData) => {
    try {
      const client = getAdminSupabaseClient();
      
      const { data, error: createError } = await client
        .from('events')
        .insert([eventData])
        .select();
      
      if (createError) {
        throw createError;
      }
      
      // Refresh events list
      fetchEvents();
      return data[0];
    } catch (err) {
      console.error('Error creating event:', err);
      throw err;
    }
  };

  // Update an existing event
  const updateEvent = async (eventData) => {
    if (!eventData || !eventData.id) {
      throw new Error('Missing event ID for update');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      const { data, error: updateError } = await client
        .from('events')
        .update(eventData)
        .eq('id', eventData.id)
        .select();
      
      if (updateError) {
        throw updateError;
      }
      
      // Refresh events list
      fetchEvents();
      return data[0];
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  };

  // Delete an event
  const deleteEvent = async (eventId) => {
    if (!eventId) {
      throw new Error('Missing event ID for deletion');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      const { error: deleteError } = await client
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Refresh events list
      fetchEvents();
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  };

  // Initial fetch of events
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    refreshEvents: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent
  };
}
