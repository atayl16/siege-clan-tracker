import { useState, useEffect, useCallback } from 'react';
import { getAdminSupabaseClient } from '../utils/supabaseClient';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get the admin client that will use service role if available
  const supabase = getAdminSupabaseClient();

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the admin client to bypass RLS
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Create a new event
  const createEvent = async (eventData) => {
    try {
      // Use the admin client to bypass RLS
      const { data, error: createError } = await supabase
        .from('events')
        .insert([eventData])
        .select();
      
      if (createError) throw createError;
      
      return data[0];
    } catch (err) {
      console.error('Error creating event:', err);
      throw err;
    }
  };

  // Update an event
  const updateEvent = async (eventData) => {
    try {
      // Use the admin client to bypass RLS
      const { data, error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventData.id)
        .select();
      
      if (updateError) throw updateError;
      
      return data[0];
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  };

  // Delete an event
  const deleteEvent = async (eventId) => {
    try {
      // Use the admin client to bypass RLS
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (deleteError) throw deleteError;
      
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  };

  // Initial fetch
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
