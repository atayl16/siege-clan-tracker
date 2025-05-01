import React, { useState } from "react";
import { useUserGoals } from "../../hooks/useUserGoals"; // Updated to use new hook
import { usePlayer } from "../../hooks/usePlayer"; // New hook for fetching player data
import GoalProgress from "./GoalProgress";
import CreateGoal from "./CreateGoal";
import { updatePlayerGoals } from "../../services/goalProgressService";
import { titleize } from "../../utils/stringUtils";
import { FaSync, FaPlus, FaTimes, FaTrash } from "react-icons/fa";

// Import UI components
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import "./Goals.css";

export default function GoalsList({ player, userId, onClose }) {
  if (!userId) {
    console.warn(
      `GoalsList: No userId provided for player ${player?.name} (${player?.wom_id})`
    );
  }

  // Use new hook for goals
  const { goals, loading, error: apiError, refresh: refreshGoals, deleteGoal } = useUserGoals();

  // Use new hook for player data
  const { refreshPlayer } = usePlayer(player?.wom_id);

  const [error, setError] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;

    try {
      const result = await deleteGoal(goalId);

      if (!result.success) {
        throw new Error("Failed to delete goal");
      }

      // No need to manually update the goals list - the hook handles it
      setError(null);
    } catch (err) {
      console.error("Error deleting goal:", err);
      setError("Failed to delete goal. Please try again.");
    }
  };

  const handleAddGoal = () => {
    setShowAddGoal(true);
  };

  const handleGoalCreated = (newGoal) => {
    // Refresh the goals list to include the new goal
    refreshGoals();
    setShowAddGoal(false);
  };

  const handleSyncProgress = async () => {
    try {
      setSyncing(true);
      setSyncSuccess(false);
      setError(null);

      // Refresh the player data using the new hook
      const refreshResult = await refreshPlayer();

      // Check if the refresh was successful
      if (!refreshResult.success) {
        console.warn("Player data refresh failed, continuing with goal updates anyway");
      }

      // Update the goals with the latest data
      const result = await updatePlayerGoals(player.wom_id, userId);

      // Refresh goals list with updated data
      refreshGoals();

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

  const getGoalTypeVariant = (goalType) => {
    switch (goalType.toLowerCase()) {
      case "skill":
        return "primary";
      case "boss":
        return "danger";
      case "activity":
        return "success";
      default:
        return "secondary";
    }
  };

  // Use apiError from hook or local error state
  const displayError = apiError ? `API Error: ${apiError.message}` : error;

  return (
    <div className="ui-goals-container">
      <div className="ui-goals-header">
        <h2>Goals for {titleize(player.name)}</h2>
        {onClose && (
          <Button
            variant="text"
            className="ui-close-button"
            onClick={onClose}
            icon={<FaTimes />}
          />
        )}
      </div>

      {displayError && (
        <div className="ui-message ui-message-error">
          <span>{displayError}</span>
        </div>
      )}

      {syncSuccess && (
        <div className="ui-message ui-message-success">
          <span>Progress updated successfully!</span>
        </div>
      )}

      <div className="ui-goals-actions">
        <Button
          variant="secondary"
          onClick={handleSyncProgress}
          disabled={syncing}
          className="ui-sync-button"
          icon={<FaSync className={syncing ? "ui-spinner" : ""} />}
        >
          {syncing ? "Updating..." : "Sync Progress"}
        </Button>

        <Button
          variant="primary"
          onClick={handleAddGoal}
          className="ui-add-goal-button"
          icon={<FaPlus />}
        >
          Add New Goal
        </Button>
      </div>

      {showAddGoal && (
        <Card className="ui-create-goal-card">
          <Card.Body>
            <CreateGoal
              player={player}
              userId={userId}
              onGoalCreated={handleGoalCreated}
              onCancel={() => setShowAddGoal(false)}
            />
          </Card.Body>
        </Card>
      )}

      {loading ? (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading goals...</div>
        </div>
      ) : goals?.length === 0 ? (
        <EmptyState
          title="No Goals Set"
          description={`You haven't set any goals for ${titleize(player.name)} yet. Click "Add New Goal" to get started!`}
          icon={<FaPlus className="ui-empty-state-icon" />}
        />
      ) : (
        <div className="ui-goals-grid">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className={`ui-goal-card ${goal.completed ? "ui-goal-completed" : ""}`}
              variant={goal.completed ? "dark" : "default"}
            >
              <Card.Header className="ui-goal-header">
                <h3 className="ui-goal-metric">{titleize(goal.metric)}</h3>
                <Badge
                  variant={getGoalTypeVariant(goal.goal_type)}
                  className="ui-goal-type-badge"
                >
                  {goal.goal_type}
                </Badge>
                {goal.completed && (
                  <Badge
                    variant="success"
                    className="ui-goal-completed-badge"
                  >
                    Completed
                  </Badge>
                )}
              </Card.Header>

              <Card.Body>
                <GoalProgress goal={goal} />

                <div className="ui-goal-details">
                  <div className="ui-goal-target">
                    <span className="ui-detail-label">Target:</span>
                    <span className="ui-detail-value">{goal.target_value.toLocaleString()}</span>
                  </div>

                  {goal.target_date && (
                    <div className="ui-goal-deadline">
                      <span className="ui-detail-label">Deadline:</span>
                      <span className="ui-detail-value">
                        {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {goal.completed && (
                    <div className="ui-goal-completion">
                      <span className="ui-detail-label">Completed on:</span>
                      <span className="ui-detail-value">
                        {new Date(goal.completed_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card.Body>

              <Card.Footer>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteGoal(goal.id)}
                  icon={<FaTrash />}
                >
                  Delete Goal
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
