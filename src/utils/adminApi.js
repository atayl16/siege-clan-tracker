import { supabase } from "../supabaseClient";

/**
 * Admin API Helper Functions
 *
 * These functions call admin edge functions that use service role privileges.
 * Authentication is done via JWT tokens from Supabase auth session.
 * No secrets are stored in the client or localStorage.
 */

/**
 * Get the current user's JWT token from Supabase session
 * @returns {Promise<string|null>} JWT token or null if not authenticated
 */
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session.access_token;
}

/**
 * Make authenticated admin API request
 * Automatically includes JWT token for authentication
 */
async function adminRequest(endpoint, options = {}) {
  const authToken = await getAuthToken();

  if (!authToken) {
    throw new Error("Not authenticated. Please log in as admin.");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

/**
 * Update a member's information
 * @param {number} womId - WiseOldMan ID of the member
 * @param {object} updates - Object containing fields to update
 * @returns {Promise<object>} Updated member data
 */
export async function updateMember(womId, updates) {
  return adminRequest("/api/admin/update-member", {
    method: "POST",
    body: JSON.stringify({ womId, updates }),
  });
}

/**
 * Delete a member
 * @param {number} womId - WiseOldMan ID of the member
 * @returns {Promise<object>} Deletion result
 */
export async function deleteMember(womId) {
  return adminRequest("/api/admin/delete-member", {
    method: "DELETE",
    body: JSON.stringify({ womId }),
  });
}

/**
 * Toggle member visibility (hide/show)
 * @param {number} womId - WiseOldMan ID of the member
 * @param {boolean} hidden - Whether to hide the member
 * @returns {Promise<object>} Updated member data
 */
export async function toggleMemberVisibility(womId, hidden) {
  return adminRequest("/api/admin/toggle-visibility", {
    method: "POST",
    body: JSON.stringify({ womId, hidden }),
  });
}

/**
 * Toggle user admin status
 * @param {string} userId - User ID (UUID)
 * @param {boolean} isAdmin - Whether to make user an admin
 * @returns {Promise<object>} Updated user data
 */
export async function toggleUserAdmin(userId, isAdmin) {
  return adminRequest("/api/admin/toggle-user-admin", {
    method: "POST",
    body: JSON.stringify({ userId, isAdmin }),
  });
}

/**
 * Note: No token management functions needed!
 * Authentication is handled automatically via Supabase JWT tokens.
 * Tokens are managed by Supabase auth session and never stored in localStorage.
 */
