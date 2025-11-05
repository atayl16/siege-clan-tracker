// Import Supabase with ES modules syntax
import { createClient } from "https://esm.sh/@supabase/supabase-js";

/**
 * Admin Edge Function: Toggle User Admin Status
 * Toggles a user's admin status using service role privileges
 * Only master admins can use this function
 */
export default async (request, _context) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
      },
    });
  }

  try {
    // Validate admin token
    const adminToken = request.headers.get("x-admin-token");
    const expectedToken = Deno.env.get("ADMIN_SECRET");

    if (!expectedToken) {
      console.warn("ADMIN_SECRET not configured - admin operations disabled");
      return new Response(JSON.stringify({ error: "Admin operations not configured" }), {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
        },
      });
    }

    if (adminToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid admin token" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
        },
      });
    }

    // Parse request body
    const body = await request.json();
    const { userId, isAdmin } = body;

    if (userId === undefined || isAdmin === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, isAdmin" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
        },
      });
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Call the admin_toggle_user_admin RPC function
    const { data, error } = await supabase.rpc("admin_toggle_user_admin", {
      p_user_id: userId,
      p_is_admin: isAdmin,
    });

    if (error) {
      console.error("Error toggling user admin status:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to toggle user admin status" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
          },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
      },
    });
  } catch (error) {
    console.error("Admin toggle user admin error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
      },
    });
  }
};

export const config = {
  path: "/api/admin/toggle-user-admin",
};
