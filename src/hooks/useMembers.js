import { useState, useEffect, useCallback } from 'react';
import { getAdminSupabaseClient } from '../utils/supabaseClient';
import * as adminApi from '../utils/adminApi';

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

  const updateMember = async (memberData) => {
    if (!memberData || !memberData.wom_id) {
      throw new Error('Missing member WOM ID for update');
    }

    try {
      // CONVERT DATA TYPES - ensure siege_score is a number
      if (memberData.siege_score !== undefined) {
        memberData.siege_score = Number(memberData.siege_score);
      }

      console.log("Attempting to update member:", memberData);

      // Use admin edge function with service role privileges
      const result = await adminApi.updateMember(memberData.wom_id, memberData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update member');
      }

      console.log("Admin API update response:", result.data);

      // Refresh members list
      await fetchMembers();
      return result.data || memberData;
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
      // Use admin edge function with service role privileges
      const result = await adminApi.deleteMember(womId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete member');
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

  // Toggle visibility function
  const toggleMemberVisibility = async (member) => {
    if (!member || !member.wom_id) {
      throw new Error('Missing member WOM ID for visibility toggle');
    }

    try {
      const newVisibility = !member.hidden;

      console.log(`Attempting to ${newVisibility ? 'hide' : 'unhide'} member:`, member.name);

      // Use admin edge function with service role privileges
      const result = await adminApi.toggleMemberVisibility(member.wom_id, newVisibility);

      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle visibility');
      }

      console.log("Admin API toggle visibility response:", result.data);

      // Refresh members list
      await fetchMembers();
      return result.data;
    } catch (err) {
      console.error('Error toggling member visibility:', err);
      throw err;
    }
  };
  
  // Change rank type function
  const changeMemberRank = async (member, newRank) => {
    if (!member || !member.wom_id) {
      throw new Error('Missing member WOM ID for rank change');
    }
    
    try {
      const client = getAdminSupabaseClient();
      
      console.log(`Changing ${member.name}'s rank to ${newRank}`);
      
      const { data, error } = await client.rpc(
        'admin_change_member_rank',
        { 
          member_id: member.wom_id,
          new_role: newRank
        }
      );
      
      if (error) throw error;
      
      console.log("RPC rank change response:", data);
      
      // Refresh members list
      await fetchMembers();
      return data;
    } catch (err) {
      console.error('Error changing member rank:', err);
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
    whitelistRunewatchMember,
    toggleMemberVisibility,
    changeMemberRank
  };
}
