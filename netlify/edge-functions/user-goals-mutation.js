import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { verifyUser, canManageResource } from "./../lib/auth-helper.js";

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
    const { action, userId, goalData } = requestData;
    
    // Authenticate using the UUID from Authorization header
    const authToken = request.headers.get("Authorization")?.split(" ")[1];
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the user exists
    const user = await verifyUser(supabase, authToken);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Verify the user can only modify their own goals
    if (userId !== user.id && !user.is_admin) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    switch (action) {
      case "create": {
        // Create a new goal
        const { data: newGoal, error: createError } = await supabase
          .from("user_goals")
          .insert([{
            user_id: userId,
            player_id: goalData.player_id,
            player_name: goalData.player_name,
            goal_type: goalData.goal_type,
            metric: goalData.metric,
            start_value: goalData.start_value,
            current_value: goalData.current_value,
            target_value: goalData.target_value,
            target_date: goalData.target_date || null,
            created_at: new Date().toISOString()
          }])
          .select();
          
        if (createError) throw createError;
        
        return new Response(JSON.stringify({ success: true, data: newGoal[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "update": {
        // Verify permission to update this goal
        if (goalData.id) {
          const canManage = await canManageResource(supabase, user.id, "user_goals", goalData.id, "user_id");
          if (!canManage) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        
        // Update the goal
        const { data: updatedGoal, error: updateError } = await supabase
          .from("user_goals")
          .update({
            target_value: goalData.target_value,
            target_date: goalData.target_date || null,
            current_value: goalData.current_value,
            completed: goalData.completed || false,
            updated_at: new Date().toISOString()
          })
          .eq("id", goalData.id)
          .select();
          
        if (updateError) throw updateError;
        
        return new Response(JSON.stringify({ success: true, data: updatedGoal[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "delete": {
        // Verify permission to delete this goal
        if (goalData.goalId) {
          const canManage = await canManageResource(supabase, user.id, "user_goals", goalData.goalId, "user_id");
          if (!canManage) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        
        // Delete the goal
        const { error: deleteError } = await supabase
          .from("user_goals")
          .delete()
          .eq("id", goalData.goalId);
          
        if (deleteError) throw deleteError;
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }  
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
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
  path: "/api/user-goals-mutation",
};
