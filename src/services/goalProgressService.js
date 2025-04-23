import { supabase } from "../supabaseClient";
import { fetchPlayerStats } from "../utils/womApi";

export async function updatePlayerGoals(womId, userId) {
  try {
    console.log(`Updating goals for player: ${womId}, user: ${userId}`);
    
    // Fetch all active goals for this player
    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('wom_id', womId)
      .eq('user_id', userId)
      .eq('completed', false);
      
    if (error) throw error;
    
    if (!goals || goals.length === 0) {
      console.log("No active goals found to update");
      return { updated: 0, completed: 0 };
    }
    
    console.log(`Found ${goals.length} active goals to update`);
    
    // Group goals by type to minimize API calls
    const skillGoals = goals.filter(goal => goal.goal_type === 'skill');
    const bossGoals = goals.filter(goal => goal.goal_type === 'boss');
    
    let updated = 0;
    let completed = 0;
    const now = new Date().toISOString();
    
    // Process skill goals
    if (skillGoals.length > 0) {
      for (const goal of skillGoals) {
        try {
          // Get the current stat for this metric
          const playerStat = await fetchPlayerStats(womId, 'skill', goal.metric);
          console.log(`Fetched stat for ${goal.metric}:`, playerStat);
          
          if (playerStat && playerStat.experience !== undefined) {
            const currentValue = playerStat.experience;
            const isCompleted = currentValue >= goal.target_value;
            
            console.log(`Goal ${goal.id} for ${goal.metric}: Current=${currentValue}, Target=${goal.target_value}, Completed=${isCompleted}`);
            
            // Always update the current value, even if it hasn't changed
            // This ensures we're working with the latest data
            const { error: updateError } = await supabase
              .from('user_goals')
              .update({
                current_value: currentValue,
                completed: isCompleted,
                completed_date: isCompleted && !goal.completed ? now : goal.completed_date
              })
              .eq('id', goal.id);
              
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
          const playerStat = await fetchPlayerStats(womId, 'boss', goal.metric);
          console.log(`Fetched stat for ${goal.metric}:`, playerStat);
          
          if (playerStat && playerStat.kills !== undefined) {
            const currentValue = playerStat.kills;
            const isCompleted = currentValue >= goal.target_value;
            
            console.log(`Goal ${goal.id} for ${goal.metric}: Current=${currentValue}, Target=${goal.target_value}, Completed=${isCompleted}`);
            
            // Always update the value
            const { error: updateError } = await supabase
              .from('user_goals')
              .update({
                current_value: currentValue,
                completed: isCompleted,
                completed_date: isCompleted && !goal.completed ? now : goal.completed_date
              })
              .eq('id', goal.id);
              
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
    
    console.log(`Goals update complete: ${updated} updated, ${completed} completed`);
    return { updated, completed };
  } catch (error) {
    console.error('Error updating player goals:', error);
    throw error;
  }
}
