import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import GoalProgress from "./GoalProgress";
import CreateGoal from "./CreateGoal";
import { refreshPlayerData } from "../../utils/womApi";
import { updatePlayerGoals } from "../../services/goalProgressService";
import "./Goals.css";

export default function GoalsList({ player, userId, onClose }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Memoize fetchGoals to use in the dependency array
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("wom_id", player.wom_id)
        .order("completed", { ascending: true })
        .order("goal_type")
        .order("metric");

      if (error) throw error;

      setGoals(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching goals:", err);
      setError("Failed to load goals. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [player.wom_id, userId]);

  // This effect runs only once to log mounting info
  useEffect(() => {
    console.log("GoalsList mounted with player:", player);
    console.log("userId:", userId);
  }, [player, userId]); // Add player and userId to dependencies

  // Fetch goals when dependencies change
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]); // Use fetchGoals instead of direct dependencies

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;

    try {
      const { error } = await supabase
        .from("user_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setGoals(goals.filter((goal) => goal.id !== goalId));
    } catch (err) {
      console.error("Error deleting goal:", err);
      alert("Failed to delete goal");
    }
  };

  const handleAddGoal = () => {
    setShowAddGoal(true);
  };

  const handleGoalCreated = (newGoal) => {
    setGoals([newGoal, ...goals]);
    setShowAddGoal(false);
  };
  
  const handleSyncProgress = async () => {
    try {
      setSyncing(true);
      setSyncSuccess(false);
      setError(null);
  
      // Refresh the player data from WOM API
      const refreshResult = await refreshPlayerData(player.wom_id);
  
      // Check if the refresh was successful
      if (!refreshResult.success) {
        console.warn("Player data refresh failed, continuing with goal updates anyway");
        // We'll continue anyway since the goals might still update correctly
      }
  
      // Update the goals with the latest data
      const result = await updatePlayerGoals(player.wom_id, userId);
  
      // Refresh goals list with updated data
      await fetchGoals();
  
      setSyncSuccess(true);
  
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSyncSuccess(false);
      }, 3000);
  
      return result;
    } catch (err) {
      console.error("Error syncing player progress:", err);
      setError("Failed to sync progress. Please try again.");
      return null;
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="goals-container">
      <div className="goals-header">
        <h2>Goals for {player.name}</h2>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {syncSuccess && (
        <div className="success-message">Progress updated successfully!</div>
      )}

      <div className="goals-actions">
        <button
          className="sync-progress-button"
          onClick={handleSyncProgress}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <span className="spinner"></span> Updating...
            </>
          ) : (
            <>
              <span className="sync-icon">↻</span> Sync Progress
            </>
          )}
        </button>

        <button className="add-goal-button" onClick={handleAddGoal}>
          <span className="button-icon">+</span> Add New Goal
        </button>
      </div>

      {showAddGoal && (
        <CreateGoal
          player={player}
          userId={userId}
          onGoalCreated={handleGoalCreated}
          onCancel={() => setShowAddGoal(false)}
        />
      )}

      {loading ? (
        <div className="loading-indicator">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="no-goals">
          <p>You haven't set any goals for {player.name} yet.</p>
          <p>Click "Add New Goal" to get started!</p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`goal-card ${goal.completed ? "completed" : ""}`}
            >
              <div className="goal-header">
                <h3>{goal.metric}</h3>
                <div className="goal-type">{goal.goal_type}</div>
              </div>

              <GoalProgress goal={goal} />

              <div className="goal-details">
                <div>Target: {goal.target_value.toLocaleString()}</div>
                {goal.target_date && (
                  <div>
                    Deadline: {new Date(goal.target_date).toLocaleDateString()}
                  </div>
                )}
                {goal.completed && (
                  <div className="completion-date">
                    Completed on:{" "}
                    {new Date(goal.completed_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="goal-actions">
                <button
                  className="delete-goal"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  Delete Goal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
