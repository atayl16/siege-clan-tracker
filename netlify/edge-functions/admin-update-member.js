// Import Supabase with ES modules syntax
import { createClient } from "https://esm.sh/@supabase/supabase-js";

/**
 * Admin Edge Function: Update Member
 * Updates a member's information using service role privileges
 */
export default async (request, _context) => {
  // Only allow POST requests
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
    const { womId, updates } = body;

    if (!womId || !updates) {
      return new Response(JSON.stringify({ error: "Missing required fields: womId, updates" }), {
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

    // Call the admin_update_member RPC function
    const { data, error } = await supabase.rpc("admin_update_member", {
      p_wom_id: womId,
      p_updates: updates,
    });

    if (error) {
      console.error("Error updating member:", error);
      return new Response(JSON.stringify({ error: error.message || "Failed to update member" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
        },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://siegeclan.com",
      },
    });
  } catch (error) {
    console.error("Admin update member error:", error);
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
  path: "/api/admin/update-member",
};
