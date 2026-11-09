import { supabase } from "../supabaseClient";

// Helper function to extract metric data from player data
// Exported for testing
export function extractMetricData(playerData, type, metric) {
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

/**
 * Fetch a player's latest stats from Wise Old Man, via our edge proxy.
 *
 * This used to call usePlayer() - a React hook - from a plain async function.
 * Hooks only work while a component renders, so it threw every time, the
 * catch below turned that into zero experience / zero kills, and
 * updatePlayerGoals wrote current_value 0 over every active goal. Each
 * profile load reset everyone's progress.
 *
 * @returns {Promise<object>} the WOM player details
 * @throws when the request fails, so callers write nothing
 */
export async function fetchPlayerStats(womId) {
  const res = await fetch(`/api/wom-player?id=${encodeURIComponent(womId)}`);
  if (!res.ok) {
    throw new Error(`Could not load stats for player ${womId} (${res.status})`);
  }
  return res.json();
}

/**
 * The value a goal measures, or undefined when the player has no data for it.
 *
 * Deliberately not extractMetricData: that falls back to { experience: 0 }
 * when the metric is missing, which would write zero progress again.
 */
function currentValueFor(playerData, goal) {
  const group = { skill: "skills", boss: "bosses" }[goal.goal_type];
  if (!group) return undefined;
  const entry =
    playerData?.latestSnapshot?.data?.[group]?.[goal.metric] ??
    playerData?.data?.[group]?.[goal.metric] ??
    playerData?.[group]?.[goal.metric];
  return goal.goal_type === "skill" ? entry?.experience : entry?.kills;
}

/**
 * Bring one character's active goals up to date with their WOM stats.
 *
 * Goals are read from user_goals directly. RLS (user_goals_own_rows) limits
 * them to the signed-in member's own, which is what the old get_user_goals
 * RPC did - except that RPC is in no migration, so a database built from this
 * repo did not have it.
 *
 * If the stats cannot be loaded, nothing is written. A failed fetch is not
 * evidence that progress went back to zero.
 */
export async function updatePlayerGoals(womId, userId) {
  const { data: goals, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("wom_id", womId)
    .eq("completed", false);

  if (error) throw error;
  if (!goals || goals.length === 0) return { updated: 0, completed: 0 };

  // One request for every goal on this character, not one per goal.
  const playerData = await fetchPlayerStats(womId);

  let updated = 0;
  let completed = 0;
  const now = new Date().toISOString();

  for (const goal of goals) {
    const currentValue = currentValueFor(playerData, goal);
    // No data for this metric: leave the stored progress alone rather than
    // overwrite it with a default.
    if (typeof currentValue !== "number") continue;

    const isCompleted = currentValue >= goal.target_value;
    const { error: updateError } = await supabase
      .from("user_goals")
      .update({
        current_value: currentValue,
        completed: isCompleted,
        completed_date: isCompleted ? now : goal.completed_date,
      })
      .eq("id", goal.id);

    if (updateError) {
      console.error(`Error updating goal ${goal.id}:`, updateError);
      continue;
    }
    updated++;
    if (isCompleted) completed++;
  }

  return { updated, completed };
}
