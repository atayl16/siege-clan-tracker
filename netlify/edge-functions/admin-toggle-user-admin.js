import {
  validateAdminRequest,
  createServiceRoleClient,
  handlePreflight,
  adminErrorResponse,
  getAdminCorsHeaders,
} from "./_shared/admin-auth.js";

/**
 * Admin Edge Function: Toggle User Admin Status
 * Toggles a user's admin status using service role privileges
 * Only master admins can use this function
 * Authenticates using JWT tokens - no secrets exposed to client
 */
export default async (request, _context) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handlePreflight();
  }

  if (request.method !== "POST") {
    return adminErrorResponse("Method not allowed", 405);
  }

  try {
    // Validate that the request comes from an authenticated admin
    const authResult = await validateAdminRequest(request);
    if (!authResult.valid) {
      return adminErrorResponse(authResult.error || "Unauthorized", 401);
    }

    // Parse request body
    const body = await request.json();
    const { userId, isAdmin } = body;

    if (userId === undefined || isAdmin === undefined) {
      return adminErrorResponse("Missing required fields: userId, isAdmin", 400);
    }

    // Initialize Supabase client with service role privileges
    const supabase = createServiceRoleClient();

    // Call the admin_toggle_user_admin RPC function
    const { data, error } = await supabase.rpc("admin_toggle_user_admin", {
      p_user_id: userId,
      p_is_admin: isAdmin,
    });

    if (error) {
      console.error("Error toggling user admin status:", error);
      return adminErrorResponse(error.message || "Failed to toggle user admin status", 500);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getAdminCorsHeaders(),
      },
    });
  } catch (error) {
    console.error("Admin toggle user admin error:", error);
    return adminErrorResponse("Internal server error", 500);
  }
};

export const config = {
  path: "/api/admin/toggle-user-admin",
};
