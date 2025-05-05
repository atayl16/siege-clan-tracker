import { useState, useEffect, useCallback } from 'react';
import { getAdminSupabaseClient } from '../utils/supabaseClient';

export function useMembers() {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the appropriate client based on admin status
      const client = getAdminSupabaseClient();
      
      const { data, error: fetchError } = await client
        .from('members')
        .select('*')
        .order('name');
      
      if (fetchError) {
        throw fetchError;
      }
      
      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new member
  const createMember = async (memberData) => {
    try {
      const client = getAdminSupabaseClient();
      
      const { data, error: createError } = await client
        .from('members')
        .insert([memberData])
        .select();
      
      if (createError) {
        throw createError;
      }
      
      // Refresh members list
      fetchMembers();
      return data[0];
    } catch (err) {
      console.error('Error creating member:', err);
      throw err;
    }
  };

  // Update a member
  const updateMember = async (memberData) => {
    if (!memberData || !memberData.wom_id) {
      throw new Error('Missing member WOM ID for update');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      const { data, error: updateError } = await client
        .from('members')
        .update(memberData)
        .eq('wom_id', memberData.wom_id)
        .select();
      
      if (updateError) {
        throw updateError;
      }

      console.log("Update response:", { data, error: updateError });
      
      // Refresh members list
      await fetchMembers();
      console.log("Members refreshed after update");
      return data[0];
    } catch (err) {
      console.error('Error updating member:', err);
      throw err;
    }
  };

  // Delete a member
  const deleteMember = async (womId) => {
    if (!womId) {
      throw new Error('Missing WOM ID for deletion');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      const { error: deleteError } = await client
        .from('members')
        .delete()
        .eq('wom_id', womId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Refresh members list
      fetchMembers();
      return true;
    } catch (err) {
      console.error('Error deleting member:', err);
      throw err;
    }
  };
  
  // Whitelist a member on Runewatch
  const whitelistRunewatchMember = async (womId, reason) => {
    if (!womId) {
      throw new Error('Missing WOM ID for whitelist');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      const { error: updateError } = await client
        .from('members')
        .update({
          runewatch_whitelisted: true,
          runewatch_whitelist_reason: reason || 'Whitelisted by admin'
        })
        .eq('wom_id', womId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Refresh members list
      fetchMembers();
      return true;
    } catch (err) {
      console.error('Error whitelisting member:', err);
      throw err;
    }
  };

  // Initial fetch of members
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refreshMembers: fetchMembers,
    createMember,
    updateMember,
    deleteMember,
    whitelistRunewatchMember
  };
}
