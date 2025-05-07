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
        // Check admin privileges
        if (!user.is_admin) {
          return new Response(JSON.stringify({ error: "Only admins can process requests" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const { id, status, admin_notes } = claimData;
        
        if (!id || !status) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Get the original request
        const { data: originalRequest, error: fetchError } = await supabase
          .from("claim_requests")
          .select("*")
          .eq("id", id)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Update the request - REMOVE processed_at, use updated_at instead
        const { data: updatedRequest, error: updateError } = await supabase
          .from("claim_requests")
          .update({
            status: status,
            admin_notes: admin_notes,
            admin_user_id: user.id,
            updated_at: new Date().toISOString() // Use updated_at to track when processed
          })
          .eq("id", id)
          .select();
          
        if (updateError) throw updateError;
                
        // If approved, update the member's claimed_by field
        if (status === "approved") {
          // First, get the member to check if it exists
          const { data: memberData, error: fetchMemberError } = await supabase
            .from("members")
            .select("wom_id")
            .eq("wom_id", originalRequest.wom_id)
            .single();
            
          if (fetchMemberError) {
            throw new Error(`Member lookup failed: ${fetchMemberError.message}`);
          }
          
          if (!memberData) {
            throw new Error(`Member with ID ${originalRequest.wom_id} not found`);
          }
          
          // Get username for claimed_by_username field
          const { data: userData } = await supabase
            .from("users")
            .select("username")
            .eq("id", originalRequest.user_id)
            .single();
                      
          // Add this logging before the update operation
          
          console.log("Original request user_id:", originalRequest.user_id);
          console.log("Original request user_id type:", typeof originalRequest.user_id);
          
          // Try explicitly formatting as UUID
          const userIdUUID = originalRequest.user_id;
          console.log("Formatted user_id:", userIdUUID);
          
          // Then use it in your update
          const { error: memberError } = await supabase
            .from("members")
            .update({
              claimed_by: userIdUUID,
              claimed_by_username: userData?.username || null,
              updated_at: new Date().toISOString()
            })
            .eq("wom_id", originalRequest.wom_id);
            
          if (memberError) {
            console.error("Member update error:", memberError);
            throw new Error(`Failed to update member: ${memberError.message}`);
          }
        }
        
        return new Response(JSON.stringify({ success: true, data: updatedRequest[0] }), {
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
