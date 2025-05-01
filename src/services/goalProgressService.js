import { supabase } from "../supabaseClient";
import { usePlayer } from "../hooks/usePlayer"; // New hook for fetching player data

// Helper function to extract metric data from player data
function extractMetricData(playerData, type, metric) {
  if (!playerData) return null;

  if (type === "skill") {
    if (playerData.latestSnapshot?.data?.skills && playerData.latestSnapshot.data.skills[metric]) {
      return playerData.latestSnapshot.data.skills[metric];
    } else if (playerData.data?.skills && playerData.data.skills[metric]) {
      return playerData.data.skills[metric];
    } else if (playerData.skills && playerData.skills[metric]) {
      return playerData.skills[metric];
    }
    return { experience: 0, level: 1, rank: 0 };
  } else if (type === "boss") {
    if (playerData.latestSnapshot?.data?.bosses && playerData.latestSnapshot.data.bosses[metric]) {
      return playerData.latestSnapshot.data.bosses[metric];
    } else if (playerData.data?.bosses && playerData.data.bosses[metric]) {
      return playerData.data.bosses[metric];
    } else if (playerData.bosses && playerData.bosses[metric]) {
      return playerData.bosses[metric];
    }
    return { kills: 0, rank: 0 };
  }
  return null;
}

// Get player statistics using the new hook
async function getPlayerStat(womId, type, metric) {
  try {
    // Use the new hook to fetch player data
    const { data: playerData, error } = await usePlayer(womId);

    if (error) {
      console.error(`Error fetching player data for WOM ID ${womId}:`, error);
      throw error;
    }

    const metricData = extractMetricData(playerData, type, metric);
    if (metricData) {
      console.log(`Found ${type} data for ${metric}:`, metricData);
      return metricData;
    }

    console.warn(`No ${type} data found for ${metric}`);
    return type === "skill" ? { experience: 0, level: 1, rank: 0 } : { kills: 0, rank: 0 };
  } catch (error) {
    console.error(`Failed to get player stat for ${type} ${metric}:`, error);
    return type === "skill" ? { experience: 0, level: 1, rank: 0 } : { kills: 0, rank: 0 };
  }
}

export async function updatePlayerGoals(womId, userId) {
  try {
    console.log(`Updating goals for player: ${womId}, user: ${userId}`);

    // Fetch all active goals for this player using RPC
    const { data: allGoals, error } = await supabase.rpc("get_user_goals", {
      user_id_param: userId,
    });

    if (error) throw error;

    // Filter goals for this specific player
    const goals = allGoals
      ? allGoals.filter((goal) => goal.wom_id === womId && !goal.completed)
      : [];

    if (!goals || goals.length === 0) {
      console.log("No active goals found to update");
      return { updated: 0, completed: 0 };
    }

    console.log(`Found ${goals.length} active goals to update`);

    // Group goals by type to minimize API calls
    const skillGoals = goals.filter((goal) => goal.goal_type === "skill");
    const bossGoals = goals.filter((goal) => goal.goal_type === "boss");

    let updated = 0;
    let completed = 0;
    const now = new Date().toISOString();

    // Process skill goals
    if (skillGoals.length > 0) {
      for (const goal of skillGoals) {
        try {
          // Get the current stat for this metric
          const playerStat = await getPlayerStat(womId, "skill", goal.metric);

          console.log(`Fetched stat for ${goal.metric}:`, playerStat);

          if (playerStat && playerStat.experience !== undefined) {
            const currentValue = playerStat.experience;
            const isCompleted = currentValue >= goal.target_value;

            console.log(
              `Goal ${goal.id} for ${goal.metric}: Current=${currentValue}, Target=${goal.target_value}, Completed=${isCompleted}`
            );

            // Always update the current value, even if it hasn't changed
            const { error: updateError } = await supabase
              .from("user_goals")
              .update({
                current_value: currentValue,
                completed: isCompleted,
                completed_date:
                  isCompleted && !goal.completed ? now : goal.completed_date,
              })
              .eq("id", goal.id);

            if (!updateError) {
              updated++;
              if (isCompleted && !goal.completed) completed++;
            } else {
              console.error(`Error updating goal ${goal.id}:`, updateError);
            }
          } else {
            console.warn(`No experience data found for ${goal.metric}`);
          }
        } catch (err) {
          console.error(`Error processing skill goal ${goal.id}:`, err);
        }
      }
    }

    // Process boss goals
    if (bossGoals.length > 0) {
      for (const goal of bossGoals) {
        try {
          const playerStat = await getPlayerStat(womId, "boss", goal.metric);

          console.log(`Fetched stat for ${goal.metric}:`, playerStat);

          if (playerStat && playerStat.kills !== undefined) {
            const currentValue = playerStat.kills;
            const isCompleted = currentValue >= goal.target_value;

            console.log(
              `Goal ${goal.id} for ${goal.metric}: Current=${currentValue}, Target=${goal.target_value}, Completed=${isCompleted}`
            );

            // Always update the value
            const { error: updateError } = await supabase
              .from("user_goals")
              .update({
                current_value: currentValue,
                completed: isCompleted,
                completed_date:
                  isCompleted && !goal.completed ? now : goal.completed_date,
              })
              .eq("id", goal.id);

            if (!updateError) {
              updated++;
              if (isCompleted && !goal.completed) completed++;
            } else {
              console.error(`Error updating goal ${goal.id}:`, updateError);
            }
          } else {
            console.warn(`No kills data found for ${goal.metric}`);
          }
        } catch (err) {
          console.error(`Error processing boss goal ${goal.id}:`, err);
        }
      }
    }

    console.log(
      `Goals update complete: ${updated} updated, ${completed} completed`
    );
    return { updated, completed };
  } catch (error) {
    console.error("Error updating player goals:", error);
    throw error;
  }
}
