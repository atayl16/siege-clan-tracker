import { createClient } from "https://esm.sh/@supabase/supabase-js";

/**
 * Admin Authentication Module for Edge Functions
 *
 * This module provides JWT-based admin authentication.
 * It validates the user's Supabase JWT token and checks their admin status.
 * No secrets are exposed to the client - authentication uses existing session tokens.
 */

/**
 * Validate that the request comes from an authenticated admin user
 * @param {Request} request - The incoming request
 * @returns {Promise<{valid: boolean, userId?: string, error?: string}>}
 */
export async function validateAdminRequest(request) {
  try {
    // Get the JWT token from the Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        valid: false,
        error: "Missing or invalid Authorization header"
      };
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with service role for admin checks
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing");
      return { valid: false, error: "Server configuration error" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn("JWT validation failed:", authError?.message);
      return { valid: false, error: "Invalid or expired token" };
    }

    // Check if user is an admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Error checking admin status:", userError);
      return { valid: false, error: "Failed to verify admin status" };
    }

    if (!userData || !userData.is_admin) {
      return { valid: false, error: "User is not an admin" };
    }

    // User is authenticated and is an admin
    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("Admin validation error:", error);
    return { valid: false, error: "Authentication failed" };
  }
}

/**
 * Create a Supabase client with service role privileges
 * Only call this after validating admin status with validateAdminRequest
 * @returns {object} Supabase client with service role
 */
export function createServiceRoleClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/**
 * Get CORS headers for admin endpoints
 * @returns {object} CORS headers
 */
export function getAdminCorsHeaders() {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/**
 * Handle OPTIONS preflight requests
 * @returns {Response} CORS preflight response
 */
export function handlePreflight() {
  return new Response(null, {
    status: 204,
    headers: getAdminCorsHeaders(),
  });
}

/**
 * Create an error response with CORS headers
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} Error response
 */
export function adminErrorResponse(message, status = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getAdminCorsHeaders(),
      },
    }
  );
}
