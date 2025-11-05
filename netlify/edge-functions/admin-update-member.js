import {
  validateAdminRequest,
  createServiceRoleClient,
  handlePreflight,
  adminErrorResponse,
  getAdminCorsHeaders,
} from "./_shared/admin-auth.js";

/**
 * Admin Edge Function: Update Member
 * Updates a member's information using service role privileges
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

    const { womId, updates } = body;

    if (!womId || !updates) {
      return adminErrorResponse("Missing required fields: womId, updates", 400);
    }

    // Initialize Supabase client with service role privileges
    const supabase = createServiceRoleClient();

    // Call the admin_update_member RPC function
    const { data, error } = await supabase.rpc("admin_update_member", {
      p_wom_id: womId,
      p_updates: updates,
    });

    if (error) {
      console.error("Error updating member:", error);
      return adminErrorResponse(error.message || "Failed to update member", 500);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getAdminCorsHeaders(),
      },
    });
  } catch (error) {
    console.error("Admin update member error:", error);
    return adminErrorResponse("Internal server error", 500);
  }
};

export const config = {
  path: "/api/admin/update-member",
};
