import { useState, useEffect, useCallback } from 'react';
import { getAdminSupabaseClient } from '../utils/supabaseClient';
import { supabase } from '../supabaseClient';

/**
 * Get auth headers for admin API calls.
 *
 * Retrieves the Supabase session token for authenticated admin requests.
 * Throws an error if user is not admin or session is missing.
 *
 * @returns {Promise<Object>} Auth headers object with Authorization Bearer token
 * @throws {Error} If user is not admin or missing Supabase session
 *
 * @example
 * const headers = await getAuthHeaders();
 * // Returns: { 'Authorization': 'Bearer eyJhbGc...' }
 */
async function getAuthHeaders() {
  // Check if user is logged in as admin
  const isAdmin = localStorage.getItem("adminAuth") === "true";

  if (!isAdmin) {
    throw new Error('Admin authentication required');
  }

  // Try to get the current session token from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  // If no session (hardcoded admin), return empty headers
  // Same-origin requests are allowed by validateAuth without authentication
  if (!session?.access_token) {
    console.log('No Supabase session - using same-origin authentication');
    return {};
  }

  // Return Bearer token for Supabase-authenticated admins
  return {
    'Authorization': `Bearer ${session.access_token}`,
  };
}

/**
 * Hook for fetching and managing clan members data.
 *
 * Provides member list with optional filtering of claimed players.
 * Includes admin operations like toggling member visibility.
 * Uses admin Supabase client to bypass RLS when user is admin.
 *
 * @param {boolean} [excludeClaimed=false] - If true, filters out claimed members
 * @returns {{
 *   members: Array<Object>,
 *   loading: boolean,
 *   error: Error|null,
 *   refreshMembers: Function,
 *   toggleMemberVisibility: Function
 * }} Members data and mutation functions
 *
 * @example
 * const { members, loading, toggleMemberVisibility } = useMembers(true);
 *
 * // Toggle member visibility (admin only)
 * await toggleMemberVisibility(memberId, true); // Hide member
 */
export function useMembers(excludeClaimed = false) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the appropriate client based on admin status
      const client = getAdminSupabaseClient();

      // Add timeout to members query
      const membersPromise = client
        .from('members')
        .select('*')
        .is('left_date', null)
        .order('name');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Members query timeout - please check your connection')), 10000)
      );

      const { data, error: fetchError } = await Promise.race([membersPromise, timeoutPromise]);

      if (fetchError) {
        throw fetchError;
      }

      // Filter out claimed members if requested
      if (excludeClaimed) {
        const claimsPromise = client
          .from('player_claims')
          .select('wom_id');

        const claimsTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claims query timeout')), 5000)
        );

        const { data: claimedPlayers, error: claimsError } = await Promise.race([claimsPromise, claimsTimeoutPromise]);

        if (claimsError) {
          console.error('Error fetching claimed players:', claimsError);
          // If we can't fetch claimed players, return all members
          setMembers(data);
          return;
        }

        const claimedIds = new Set(claimedPlayers?.map(p => p.wom_id) || []);
        const availableMembers = data.filter(m => !claimedIds.has(m.wom_id));
        setMembers(availableMembers);
        return;
      }

      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [excludeClaimed]);

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

      // Get auth headers
      const authHeaders = await getAuthHeaders();

      // Call Netlify edge function instead of direct Supabase
      const response = await fetch('/.netlify/functions/admin-update-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          memberId: memberData.wom_id,
          updatedData: memberData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update member');
      }

      const result = await response.json();
      console.log("Edge function update response:", result);

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
      // Get auth headers
      const authHeaders = await getAuthHeaders();

      // Call Netlify edge function instead of direct Supabase
      const response = await fetch('/.netlify/functions/admin-delete-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ womId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete member');
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

      // Get auth headers
      const authHeaders = await getAuthHeaders();

      // Call Netlify edge function instead of direct Supabase
      const response = await fetch('/.netlify/functions/admin-toggle-member-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          memberId: member.wom_id,
          isHidden: newVisibility
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle member visibility');
      }

      const result = await response.json();
      console.log("Edge function toggle visibility response:", result);

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
