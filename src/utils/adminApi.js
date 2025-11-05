/**
 * Admin API Helper Functions
 *
 * These functions call admin edge functions that use service role privileges.
 * All functions require an admin token stored in localStorage.
 */

/**
 * Get admin token from localStorage
 */
function getAdminToken() {
  return localStorage.getItem("adminToken");
}

/**
 * Make authenticated admin API request
 */
async function adminRequest(endpoint, options = {}) {
  const adminToken = getAdminToken();

  if (!adminToken) {
    throw new Error("Admin token not found. Please log in as admin.");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": adminToken,
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
 * Generate and store admin token on login
 * This should be called after successful admin authentication
 * @param {string} token - Admin token to store
 */
export function setAdminToken(token) {
  localStorage.setItem("adminToken", token);
}

/**
 * Clear admin token on logout
 */
export function clearAdminToken() {
  localStorage.removeItem("adminToken");
}
