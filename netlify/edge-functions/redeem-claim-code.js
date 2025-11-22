import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get environment variables
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Parse request body
    const { code, userId } = await request.json();

    // Validate required fields
    if (!code || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: code, userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Redeeming claim code for user ${userId}`);

    // Find member with this claim code
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("wom_id, name, claim_code, claimed_by")
      .eq("claim_code", code)
      .single();

    if (memberError || !memberData) {
      console.error('Member not found or error:', memberError);
      return new Response(JSON.stringify({ error: 'Invalid or already used claim code' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already claimed
    if (memberData.claimed_by) {
      return new Response(JSON.stringify({ error: 'This player has already been claimed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const womId = memberData.wom_id;
    const playerName = memberData.name || "Unknown Player";

    // Claim the member
    const { error: claimError } = await supabase
      .from("members")
      .update({
        claimed_by: userId,
        claim_code: null // Clear the claim code after use
      })
      .eq("wom_id", womId);

    if (claimError) {
      console.error('Error claiming member:', claimError);
      throw new Error(claimError.message || "Failed to claim member");
    }

    console.log(`Successfully claimed member ${womId} for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      playerName: playerName
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/redeem-claim-code",
};
