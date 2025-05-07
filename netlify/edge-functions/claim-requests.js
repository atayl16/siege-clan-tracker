import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { verifyUser } from "./../lib/auth-helper.js";

export default async (request, _context) => {
  // Get environment variables
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get auth token from header
    const token = request.headers.get("Authorization")?.split(" ")[1];
    
    // Get user ID from query parameters as fallback
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");
    
    // Use either token or query parameter
    const userId = token || queryUserId;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Verify user if token provided
    let isAdmin = false;
    if (token) {
      const user = await verifyUser(supabase, token);
      isAdmin = user?.is_admin === true;
    }
    
    // Start building the query
    let query = supabase.from("claim_requests").select(`
        *,
        requester:user_id(username)
      `);
    
    // If not admin, only show the user's own requests
    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }
    
    // Execute the query with ordering
    const { data, error } = await query.order("created_at", { ascending: false });
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item) => ({
      ...item,
      username: item.requester?.username || null,
    }));

    console.log(
      `Retrieved ${transformedData?.length || 0} claim requests for user ${userId}`
    );
    
    return new Response(JSON.stringify(transformedData || []), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/claim-requests",
};
