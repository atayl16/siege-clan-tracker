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
    const { requestId, action, adminNotes, userId, womId } = await request.json();

    // Validate required fields
    if (!requestId || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields: requestId, action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate action
    if (!['approved', 'denied'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action. Must be "approved" or "denied"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Processing claim request ${requestId} with action: ${action}`);

    // Update the request status
    // Note: updated_at is automatically handled by database trigger
    const { error: updateError } = await supabase
      .from("claim_requests")
      .update({
        status: action,
        admin_notes: adminNotes || null,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      throw new Error(updateError.message || "Failed to update request status");
    }

    // If approved, create the player claim
    if (action === "approved" && userId && womId) {
      console.log(`Creating player claim for user ${userId} and wom_id ${womId}`);

      const { error: claimError } = await supabase
        .from("player_claims")
        .insert([{
          user_id: userId,
          wom_id: womId,
        }]);

      if (claimError) {
        console.error('Error creating player claim:', claimError);
        throw new Error(claimError.message || "Failed to create player claim");
      }
    }

    console.log(`Successfully processed claim request ${requestId}`);

    return new Response(JSON.stringify({ success: true }), {
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
  path: "/api/process-claim-request",
};
