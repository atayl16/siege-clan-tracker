import React, { useState, useEffect } from 'react';
import { usePlayerMetrics, usePlayerStats, useGoals } from "../../context/DataContext";
import { FaLock, FaGlobe, FaArrowUp, FaTrophy, FaTimes } from "react-icons/fa";
import { titleize } from '../../utils/stringUtils';
import MetricSelector from '../MetricSelector';

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
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user has interacted with the form
  
  // Use context hooks instead of direct API calls
  const { stats: currentStats, loading: loadingStats } = usePlayerStats(
    player.wom_id, 
    goalType, 
    selectedMetric
  );
  const { createGoal, loading: submitting } = useGoals();

  // Set initial selected metric when metrics load
  const handleMetricChange = (metric) => {
    setSelectedMetric(metric);
    setHasInteracted(true); // User has now interacted with the form
  };

  // Clear any errors when switching goal types
  const handleGoalTypeChange = (type) => {
    setGoalType(type);
    setSelectedMetric(""); // Reset the metric when changing types
    setError(null); // Clear any existing errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasInteracted(true); // User has now definitely interacted with the form
  
    if (!selectedMetric || !targetValue) {
      setError("Please fill out all required fields");
      return;
    }
  
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

      {/* Only display errors after form interaction */}
      {error && hasInteracted && (
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
                onClick={() => handleGoalTypeChange("skill")}
                className="ui-type-button"
              >
                <span className="ui-button-icon">📊</span> Skill
              </Button>
              <Button
                type="button"
                variant={goalType === "boss" ? "primary" : "secondary"}
                onClick={() => handleGoalTypeChange("boss")}
                className="ui-type-button"
              >
                <span className="ui-button-icon">👹</span> Boss
              </Button>
            </div>
          </div>

          <div className="ui-form-group">
            <MetricSelector
              metricType={goalType}
              selectedMetric={selectedMetric}
              onMetricChange={handleMetricChange}
              disabled={false}
              required={true}
            />
          </div>

          {/* Only show loading indicator or stats after a metric has been selected */}
          {selectedMetric && (
            loadingStats ? (
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
            ) : hasInteracted ? (
              <div className="ui-message ui-message-warning">
                <span>
                  Could not load stats for {selectedMetric}. Please try a
                  different {goalType}.
                </span>
              </div>
            ) : null
          )}
        </div>

        {/* Target Mode Selection */}
        <div className="ui-form-group">
          <label className="ui-form-label">Target Type</label>
          <div className="ui-option-cards">
            <Card
              className={`ui-option-card ${
                targetMode === "gain" ? "ui-selected" : ""
              }`}
              onClick={() => {
                setTargetMode("gain");
                setHasInteracted(true);
              }}
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
              className={`ui-option-card ${
                targetMode === "total" ? "ui-selected" : ""
              }`}
              onClick={() => {
                setTargetMode("total");
                setHasInteracted(true);
              }}
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
                targetMode === "total" && currentStats
                  ? goalType === "skill"
                    ? (currentStats.experience || 0) + 1
                    : (currentStats.kills || 0) + 1
                  : 1
              }
              value={targetValue}
              onChange={(e) => {
                setTargetValue(e.target.value);
                setHasInteracted(true);
              }}
              required
            />
          </div>

          <div className="ui-form-group ui-flex-grow">
            <label className="ui-form-label">Target Date (Optional)</label>
            <input
              type="date"
              className="ui-form-input"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
                setHasInteracted(true);
              }}
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
              onClick={() => {
                setIsPublic(false);
                setHasInteracted(true);
              }}
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
              onClick={() => {
                setIsPublic(true);
                setHasInteracted(true);
              }}
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
            disabled={
              submitting || !selectedMetric || !targetValue || loadingStats
            }
          >
            {submitting ? "Creating..." : "Create Goal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
