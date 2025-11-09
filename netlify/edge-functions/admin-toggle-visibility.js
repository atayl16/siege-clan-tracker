import {
  validateAdminRequest,
  createServiceRoleClient,
  handlePreflight,
  adminErrorResponse,
  getAdminCorsHeaders,
} from "./_shared/admin-auth.js";

/**
 * Admin Edge Function: Toggle Member Visibility
 * Toggles a member's visibility (hidden/shown) using service role privileges
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
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn("Invalid JSON payload:", parseError);
      return adminErrorResponse("Invalid JSON payload", 400);
    }

    const { womId, hidden } = body;

    if (womId === undefined || hidden === undefined) {
      return adminErrorResponse("Missing required fields: womId, hidden", 400);
    }

    // Initialize Supabase client with service role privileges
    const supabase = createServiceRoleClient();

    // Call the admin_toggle_member_visibility RPC function
    const { data, error } = await supabase.rpc("admin_toggle_member_visibility", {
      member_id: womId,
      is_hidden: hidden,
    });

    if (error) {
      console.error("Error toggling member visibility:", error);
      return adminErrorResponse(error.message || "Failed to toggle member visibility", 500);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getAdminCorsHeaders(),
      },
    });
  } catch (error) {
    console.error("Admin toggle visibility error:", error);
    return adminErrorResponse("Internal server error", 500);
  }
};

export const config = {
  path: "/api/admin/toggle-visibility",
};
