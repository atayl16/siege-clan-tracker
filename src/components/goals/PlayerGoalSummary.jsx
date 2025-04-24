import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import GoalProgress from './GoalProgress';
import './PlayerGoalSummary.css';

export default function PlayerGoalSummary({ playerId, userId }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerGoals() {
      if (!playerId || !userId) return;
      
      setLoading(true);
      try {
        // Use RPC function to bypass RLS
        const { data, error } = await supabase.rpc(
          "get_user_goals",
          { user_id_param: userId }
        );
        
        if (error) throw error;
        
        // Filter goals for this player
        const playerGoals = data
          ? data
              .filter(goal => goal.wom_id === playerId && !goal.completed)
              .sort((a, b) => b.id - a.id)
              .slice(0, 3)
          : [];
        
        setGoals(playerGoals);
      } catch (err) {
        console.error('Error fetching player goals:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPlayerGoals();
  }, [playerId, userId]);

  if (loading) {
    return <div className="inline-goals-loading">Loading goals...</div>;
  }

  if (goals.length === 0) {
    return <div className="inline-goals-empty">No active goals</div>;
  }

  return (
    <div className="inline-goals-container">
      <h4 className="inline-goals-header">Current Goals</h4>
      <div className="inline-goals-list">
        {goals.map(goal => (
          <div key={goal.id} className="inline-goal-item">
            <div className="inline-goal-title">
              {goal.metric} ({goal.goal_type})
            </div>
            <GoalProgress goal={goal} />
          </div>
        ))}
      </div>
    </div>
  );
}
