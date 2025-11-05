import {
  validateAdminRequest,
  createServiceRoleClient,
  handlePreflight,
  adminErrorResponse,
  getAdminCorsHeaders,
} from "./_shared/admin-auth.js";

/**
 * Admin Edge Function: Delete Member
 * Deletes a member using service role privileges
 * Authenticates using JWT tokens - no secrets exposed to client
 */
export default async (request, _context) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handlePreflight();
  }

  if (request.method !== "DELETE") {
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

    const { womId } = body;

    if (!womId) {
      return adminErrorResponse("Missing required field: womId", 400);
    }

    // Initialize Supabase client with service role privileges
    const supabase = createServiceRoleClient();

    // Call the admin_delete_member RPC function
    const { data, error } = await supabase.rpc("admin_delete_member", {
      p_wom_id: womId,
    });

    if (error) {
      console.error("Error deleting member:", error);
      return adminErrorResponse(error.message || "Failed to delete member", 500);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getAdminCorsHeaders(),
      },
    });
  } catch (error) {
    console.error("Admin delete member error:", error);
    return adminErrorResponse("Internal server error", 500);
  }
};

export const config = {
  path: "/api/admin/delete-member",
};
