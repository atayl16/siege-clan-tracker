import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { verifyUser } from "./../lib/auth-helper.js";

export default async (request, _context) => {
  // Get environment variables
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Get userId from query params
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the requesting user (optional, for extra security)
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (token) {
      const user = await verifyUser(supabase, token);
      // Only allow admins or the user themselves to see their claims
      if (!user || (user.id !== userId && !user.is_admin)) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Fetch members claimed by this user
    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("*")
      .eq("claimed_by", userId);

    if (membersError) throw membersError;

    // Transform the data to match expected format
    const transformedData = membersData.map(member => ({
      id: member.id,
      user_id: member.claimed_by,
      wom_id: member.wom_id,
      claimed_at: member.updated_at,
      members: {
        name: member.name,
        current_lvl: member.current_lvl,
        ehb: member.ehb,
        siege_score: member.siege_score,
        wom_id: member.wom_id
      }
    }));

    return new Response(JSON.stringify(transformedData), {
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
  path: "/api/user-claims",
};
