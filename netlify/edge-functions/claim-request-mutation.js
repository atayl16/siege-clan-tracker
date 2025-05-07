import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { verifyUser } from "./../lib/auth-helper.js";

export default async (request, _context) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get environment variables
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Parse request body
    const requestData = await request.json();
    const { action, claimData } = requestData;
    
    // Get auth token (user UUID)
    const token = request.headers.get("Authorization")?.split(" ")[1];
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user
    const user = await verifyUser(supabase, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    switch (action) {
      case "create": {
        // Create a new claim request
        const { data: newRequest, error: createError } = await supabase
          .from("claim_requests")
          .insert([{
            user_id: user.id,
            wom_id: claimData.wom_id,
            rsn: claimData.rsn,
            message: claimData.message,
            status: "pending",
            created_at: new Date().toISOString()
          }])
          .select();
          
        if (createError) throw createError;
        
        return new Response(JSON.stringify({ success: true, data: newRequest[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      case "process": {
        // Only admins can process requests
        if (!user.is_admin) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Update the request status
        const { data: processedRequest, error: processError } = await supabase
          .from("claim_requests")
          .update({
            status: claimData.status,
            admin_notes: claimData.admin_notes,
            processed_at: new Date().toISOString(),
            admin_user_id: user.id
          })
          .eq("id", claimData.id)
          .select();
          
        if (processError) throw processError;
        
        // If approved, update the member's claimed_by field
        if (claimData.status === "approved" && processedRequest[0]) {
          const { error: memberError } = await supabase
            .from("members")
            .update({ claimed_by: processedRequest[0].user_id })
            .eq("wom_id", processedRequest[0].wom_id);
            
          if (memberError) throw memberError;
        }
        
        return new Response(JSON.stringify({ success: true, data: processedRequest[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      default: {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/claim-request-mutation",
};
