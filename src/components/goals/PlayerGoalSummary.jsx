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
        const { data, error } = await supabase
          .from('user_goals')
          .select('*')
          .eq('wom_id', playerId)
          .eq('user_id', userId)
          .eq('completed', false) // Show only incomplete goals
          .order('id', { ascending: false }) // Order by id instead of created_at
          .limit(3); // Show max 3 goals in the summary
        
        if (error) throw error;
        
        setGoals(data || []);
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
