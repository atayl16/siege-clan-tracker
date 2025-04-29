import React, { useState, useEffect } from 'react';
import { usePlayerMetrics, usePlayerStats, useGoals } from "../../context/DataContext";
import { FaLock, FaGlobe, FaArrowUp, FaTrophy, FaTimes } from "react-icons/fa";
import { titleize } from '../../utils/stringUtils';

// Import UI components
import Button from "../ui/Button";
import Card from "../ui/Card";
import "./CreateGoal.css";

export default function CreateGoal({ player, userId, onGoalCreated, onCancel }) {
  // Form state
  const [goalType, setGoalType] = useState("skill");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState(null);
  const [targetMode, setTargetMode] = useState("gain");
  const [isPublic, setIsPublic] = useState(false);

  // Use context hooks instead of direct API calls
  const { metrics, loading: loadingMetrics } = usePlayerMetrics(goalType);
  const { stats: currentStats, loading: loadingStats } = usePlayerStats(
    player.wom_id, 
    goalType, 
    selectedMetric
  );
  const { createGoal, loading: submitting } = useGoals();

  // Set initial selected metric when metrics load
  useEffect(() => {
    if (metrics?.length > 0 && !selectedMetric) {
      setSelectedMetric(metrics[0]?.metric || "");
    }
  }, [metrics, selectedMetric]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!selectedMetric || !targetValue) {
      setError("Please fill out all required fields");
      return;
    }
  
    // Add debug logs to help understand what's happening
    console.log("Current stats:", currentStats);
    console.log("Selected metric:", selectedMetric);
    console.log("Current stats loading:", loadingStats);
  
    // Check if currentStats is loaded yet
    if (loadingStats) {
      setError("Player statistics are still loading. Please wait a moment and try again.");
      return;
    }
  
    if (!currentStats) {
      setError("Unable to load player statistics. Please try again or select a different skill/boss.");
      return;
    }
  
    const targetValueInput = parseInt(targetValue, 10);
    let currentValue, startValue, actualTargetValue;
  
    if (goalType === "skill") {
      // Safely access experience value with null coalescence
      currentValue = currentStats.experience || 0;
      startValue = currentStats.experience || 0;
  
      if (currentValue === 0 && selectedMetric) {
        setError(`Could not find current experience for ${selectedMetric}. Try selecting a different skill.`);
        return;
      }
  
      // Calculate the target value based on mode
      if (targetMode === "total") {
        actualTargetValue = targetValueInput;
      } else {
        actualTargetValue = currentValue + targetValueInput;
      }
    } else {
      // Safely access kill count with null coalescence
      currentValue = currentStats.kills || 0;
      startValue = currentStats.kills || 0;
      
      if (currentValue === 0 && selectedMetric) {
        setError(`Could not find current kill count for ${selectedMetric}. Try selecting a different boss.`);
        return;
      }
  
      // Calculate the target value based on mode
      if (targetMode === "total") {
        actualTargetValue = targetValueInput;
      } else {
        actualTargetValue = currentValue + targetValueInput;
      }
    }
  
    // Validation depends on target mode
    if (targetMode === "total" && actualTargetValue <= startValue) {
      setError("Target value must be greater than current value");
      return;
    } else if (targetMode === "gain" && targetValueInput <= 0) {
      setError("Gain must be greater than zero");
      return;
    }

    setError(null);

    try {
      const goalData = {
        user_id: userId,
        wom_id: player.wom_id,
        goal_type: goalType,
        metric: selectedMetric,
        target_value: actualTargetValue,
        start_value: startValue,
        current_value: currentValue,
        target_date: targetDate || null,
        public: isPublic,
      };

      const newGoal = await createGoal(goalData);
      if (newGoal) {
        onGoalCreated(newGoal);
      }
    } catch (err) {
      console.error("Error creating goal:", err);
      setError("Failed to create goal. Please try again.");
    }
  };

  return (
    <div className="ui-create-goal-container">
      <div className="ui-goal-form-header">
        <h3>New Goal for {titleize(player.name)}</h3>
        <Button 
          variant="text" 
          size="sm" 
          onClick={onCancel}
          icon={<FaTimes />}
          className="ui-close-button"
        />
      </div>

      {error && (
        <div className="ui-message ui-message-error">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-goal-creation-form">
        {/* Section 1: Goal Type & Metric Selection */}
        <div className="ui-form-section">
          <div className="ui-form-group">
            <div className="ui-goal-type-buttons">
              <Button
                type="button"
                variant={goalType === "skill" ? "primary" : "secondary"}
                onClick={() => setGoalType("skill")}
                className="ui-type-button"
              >
                <span className="ui-button-icon">📊</span> Skill
              </Button>
              <Button
                type="button"
                variant={goalType === "boss" ? "primary" : "secondary"}
                onClick={() => setGoalType("boss")}
                className="ui-type-button"
              >
                <span className="ui-button-icon">👹</span> Boss
              </Button>
            </div>
          </div>

          <div className="ui-form-group">
            {loadingMetrics ? (
              <div className="ui-loading-indicator">
                <div className="ui-loading-spinner"></div>
                <div className="ui-loading-text">Loading options...</div>
              </div>
            ) : (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                required
                disabled={loadingMetrics}
                className="ui-form-select"
              >
                <option value="">-- Select {goalType} --</option>
                {metrics?.map((metric) => (
                  <option key={metric.metric} value={metric.metric}>
                    {metric.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loadingStats ? (
            <div className="ui-loading-indicator">
              <div className="ui-loading-spinner"></div>
              <div className="ui-loading-text">Loading player stats...</div>
            </div>
          ) : currentStats ? (
            <Card variant="dark" className="ui-current-stats">
              <Card.Body>
                <div className="ui-stats-label">
                  Current {goalType === "skill" ? "XP" : "Kills"}
                </div>
                <div className="ui-stats-value">
                  {goalType === "skill"
                    ? (currentStats.experience !== undefined
                        ? currentStats.experience
                        : 0
                      ).toLocaleString()
                    : (currentStats.kills !== undefined
                        ? currentStats.kills
                        : 0
                      ).toLocaleString()}
                </div>
              </Card.Body>
            </Card>
          ) : (
            <div className="ui-message ui-message-warning">
              <span>Could not load stats for {selectedMetric}. Please try a different {goalType}.</span>
            </div>
          )}
        </div>

        {/* Target Mode Selection */}
        <div className="ui-form-group">
          <label className="ui-form-label">Target Type</label>
          <div className="ui-option-cards">
            <Card 
              className={`ui-option-card ${targetMode === "gain" ? "ui-selected" : ""}`}
              onClick={() => setTargetMode("gain")}
              variant={targetMode === "gain" ? "primary" : "dark"}
              clickable
            >
              <Card.Body className="ui-option-card-body">
                <div className="ui-option-card-icon">
                  <FaArrowUp />
                </div>
                <div className="ui-option-card-content">
                  <span className="ui-option-card-title">Gain Amount</span>
                  <span className="ui-option-card-description">
                    Add to current {goalType === "skill" ? "XP" : "kills"}
                  </span>
                </div>
              </Card.Body>
            </Card>

            <Card
              className={`ui-option-card ${targetMode === "total" ? "ui-selected" : ""}`}
              onClick={() => setTargetMode("total")}
              variant={targetMode === "total" ? "primary" : "dark"}
              clickable
            >
              <Card.Body className="ui-option-card-body">
                <div className="ui-option-card-icon">
                  <FaTrophy />
                </div>
                <div className="ui-option-card-content">
                  <span className="ui-option-card-title">Total Goal</span>
                  <span className="ui-option-card-description">
                    Set exact target {goalType === "skill" ? "XP" : "kills"}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        <div className="ui-form-row">
          <div className="ui-form-group ui-flex-grow">
            <label className="ui-form-label">
              {targetMode === "total" ? "Target Value" : "Amount to Gain"}
            </label>
            <input
              type="number"
              className="ui-form-input"
              min={
                targetMode === "total"
                  ? currentStats
                    ? goalType === "skill"
                      ? currentStats.experience + 1
                      : currentStats.kills + 1
                    : 1
                  : 1
              }
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </div>

          <div className="ui-form-group ui-flex-grow">
            <label className="ui-form-label">Target Date (Optional)</label>
            <input
              type="date"
              className="ui-form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Privacy Selection */}
        <div className="ui-form-group">
          <label className="ui-form-label">Goal Privacy</label>
          <div className="ui-option-cards ui-privacy-cards">
            <Card
              className={`ui-option-card ${!isPublic ? "ui-selected" : ""}`}
              onClick={() => setIsPublic(false)}
              variant={!isPublic ? "primary" : "dark"}
              clickable
            >
              <Card.Body className="ui-option-card-body">
                <div className="ui-option-card-icon">
                  <FaLock />
                </div>
                <div className="ui-option-card-content">
                  <span className="ui-option-card-title">Private</span>
                  <span className="ui-option-card-description">
                    Only visible to you
                  </span>
                </div>
              </Card.Body>
            </Card>

            <Card
              className={`ui-option-card ${isPublic ? "ui-selected" : ""}`}
              onClick={() => setIsPublic(true)}
              variant={isPublic ? "primary" : "dark"}
              clickable
            >
              <Card.Body className="ui-option-card-body">
                <div className="ui-option-card-icon">
                  <FaGlobe />
                </div>
                <div className="ui-option-card-content">
                  <span className="ui-option-card-title">Public</span>
                  <span className="ui-option-card-description">
                    Visible to other players
                  </span>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="ui-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !selectedMetric || !targetValue || loadingStats}
          >
            {submitting ? "Creating..." : "Create Goal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
