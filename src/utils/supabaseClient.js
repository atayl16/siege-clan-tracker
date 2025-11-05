import { supabase } from '../supabaseClient';

/**
 * @deprecated This function is deprecated and should not be used for admin operations.
 *
 * Admin operations now use dedicated edge functions that properly utilize
 * service role privileges on the backend. This prevents security issues with
 * client-side service role key access.
 *
 * For admin operations, use the functions in src/utils/adminApi.js instead:
 * - updateMember(womId, updates)
 * - deleteMember(womId)
 * - toggleMemberVisibility(womId, hidden)
 * - toggleUserAdmin(userId, isAdmin)
 *
 * This function now simply returns the regular Supabase client with RLS policies.
 * It is kept for backward compatibility only.
 */
export function getAdminSupabaseClient() {
  // Always return the regular client - admin operations should use edge functions
  console.warn("getAdminSupabaseClient is deprecated. Use adminApi.js functions for admin operations.");
  return supabase;
}
