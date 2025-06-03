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
    const { action, raceData } = requestData;
    
    // Get auth token (user UUID)
    const token = request.headers.get("Authorization")?.split(" ")[1];
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the user
    const user = await verifyUser(supabase, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Process based on action type
    switch (action) {
      case "create": {
        // Create race with participants in a transaction
        const { participants, ...raceInfo } = raceData;
        
        // Set creator ID to current user
        raceInfo.creator_id = user.id;
        raceInfo.created_at = new Date().toISOString();
        
        // Insert the race
        const { data: newRace, error: raceError } = await supabase
          .from("races")
          .insert([raceInfo])
          .select();
          
        if (raceError) throw raceError;
        
        // Insert participants if any
        if (participants && participants.length > 0) {
          const participantsWithRaceId = participants.map(p => ({
            ...p,
            race_id: newRace[0].id
          }));
          
          const { error: participantError } = await supabase
            .from("race_participants")
            .insert(participantsWithRaceId);
            
          if (participantError) throw participantError;
        }
        
        return new Response(JSON.stringify({ success: true, data: newRace[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
        
      case "update": {
        // Verify permissions for update
        if (!raceData.id) {
          return new Response(JSON.stringify({ error: "Race ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const canManage = await canManageResource(supabase, user.id, "races", raceData.id);
        if (!canManage) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const { id, participants: updatedParticipants, ...updateData } = raceData;
        
        // Update race data
        const { data: updatedRace, error: updateError } = await supabase
          .from("races")
          .update(updateData)
          .eq("id", id)
          .select();
          
        if (updateError) throw updateError;
        
        // Update participants if provided
        if (updatedParticipants && updatedParticipants.length > 0) {
          for (const participant of updatedParticipants) {
            if (participant.id) {
              // Update existing participant
              await supabase
                .from("race_participants")
                .update({
                  metric: participant.metric,
                  target_value: participant.target_value,
                  current_value: participant.current_value || 0
                })
                .eq("id", participant.id);
            } else {
              // Add new participant
              await supabase
                .from("race_participants")
                .insert([{
                  race_id: id,
                  wom_id: participant.wom_id,
                  player_name: participant.player_name,
                  metric: participant.metric,
                  target_value: participant.target_value,
                  current_value: participant.current_value || 0
                }]);
            }
          }
        }
        
        return new Response(JSON.stringify({ success: true, data: updatedRace[0] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
        
      case "delete": {
        // Verify permission to delete
        if (!raceData.id) {
          return new Response(JSON.stringify({ error: "Race ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const canDelete = await canManageResource(supabase, user.id, "races", raceData.id);
        if (!canDelete) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Delete race (participants will be cascade deleted if set up properly)
        const { error: deleteError } = await supabase
          .from("races")
          .delete()
          .eq("id", raceData.id);
          
        if (deleteError) throw deleteError;
        
        return new Response(JSON.stringify({ success: true }), {
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
  path: "/api/races-mutation",
};
