import { createClient } from "https://esm.sh/@supabase/supabase-js";

export default async (request, _context) => {
  // Get environment variables
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    console.log("Starting claim-requests Edge Function...");
    
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
    
    console.log(`Processing request for user: ${userId}`);
    
    // Check if user is admin - use a simpler query to avoid potential join issues
    let isAdmin = false;
    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();
      
      if (userError) {
        console.log(`Error checking admin status: ${userError.message}`);
      } else {
        isAdmin = user?.is_admin === true;
        console.log(`User is admin: ${isAdmin}`);
      }
    } catch (e) {
      console.error(`Exception checking admin status: ${e.message}`);
    }
    
    // Get claim requests - use a basic query without joins
    let query = supabase.from("claim_requests").select("*");
    
    // Filter by user_id if not admin
    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }
    
    // Execute the query
    console.log("Executing claim requests query...");
    const { data: requests, error: requestsError } = await query.order("created_at", { ascending: false });
    
    if (requestsError) {
      console.error(`Error fetching requests: ${requestsError.message}`);
      throw requestsError;
    }
    
    console.log(`Found ${requests?.length || 0} claim requests`);
    
    // If no requests, return empty array
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Get usernames separately for better error isolation
    const userIds = [...new Set(requests.map(req => req.user_id))];
    
    const userMap = {};
    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, username")
        .in("id", userIds);
      
      if (usersError) {
        console.error(`Error fetching usernames: ${usersError.message}`);
      } else if (users) {
        users.forEach(user => {
          userMap[user.id] = user.username;
        });
      }
    } catch (e) {
      console.error(`Exception fetching usernames: ${e.message}`);
    }
    
    // Add username to each request
    const enrichedRequests = requests.map(req => ({
      ...req,
      username: userMap[req.user_id] || null
    }));
    
    console.log("Successfully processed claim requests");
    
    return new Response(JSON.stringify(enrichedRequests), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error(`Claim requests function error: ${error.message}`);
    console.error(error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      details: error.stack 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/claim-requests",
};
