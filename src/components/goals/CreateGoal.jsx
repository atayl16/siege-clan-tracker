import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../../supabaseClient";
import { fetchWomMetrics, fetchPlayerStats } from "../../utils/womApi";
import { FaLock, FaGlobe, FaArrowUp, FaTrophy } from "react-icons/fa";
import { titleize } from '../../utils/stringUtils';

export default function CreateGoal({ player, userId, onGoalCreated, onCancel }) {
  const [goalType, setGoalType] = useState("skill");
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [currentStats, setCurrentStats] = useState(null);
  const [error, setError] = useState(null);
  const [targetMode, setTargetMode] = useState("gain");
  const [isPublic, setIsPublic] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await fetchPlayerStats(
        player.wom_id,
        goalType,
        selectedMetric
      );
      setCurrentStats(stats);
      setTargetValue("");
    } catch (err) {
      console.error("Error fetching player stats:", err);
      setCurrentStats(goalType === "skill" ? { experience: 0 } : { kills: 0 });
      setTargetValue("");
    }
  }, [player.wom_id, goalType, selectedMetric]);

  // Fetch metrics (skills, bosses) from WOM API
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoadingMetrics(true);
        const metricsData = await fetchWomMetrics(goalType);
        setMetrics(metricsData);
        setSelectedMetric(metricsData[0]?.metric || "");
      } catch (err) {
        console.error("Error loading metrics:", err);
        setError("Failed to load metrics");
      } finally {
        setLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [goalType]);

  // Fetch current stats when metric changes
  useEffect(() => {
    if (selectedMetric && player.wom_id) {
      fetchStats();
    }
  }, [selectedMetric, player.wom_id, fetchStats]); // Add fetchStats to dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMetric || !targetValue || !currentStats) {
      setError("Please fill out all required fields");
      return;
    }

    const targetValueInput = parseInt(targetValue, 10);
    let currentValue, startValue, actualTargetValue;

    if (goalType === "skill") {
      currentValue = currentStats.experience;
      startValue = currentStats.experience;

      // Calculate the target value based on mode
      if (targetMode === "total") {
        actualTargetValue = targetValueInput;
      } else {
        actualTargetValue = currentValue + targetValueInput;
      }
    } else {
      currentValue = currentStats.kills;
      startValue = currentStats.kills;

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

    setLoading(true);
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

      const { data, error } = await supabase
        .from("user_goals")
        .insert([goalData])
        .select();

      if (error) throw error;

      onGoalCreated(data[0]);
    } catch (err) {
      console.error("Error creating goal:", err);
      setError("Failed to create goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-goal-container compact">
      <div className="goal-form-header">
        <h3>New Goal for {titleize(player.name)}</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="goal-creation-form">
        {/* Section 1: Goal Type & Metric Selection */}
        <div className="form-section">
          <div className="form-group">
            <div className="goal-type-buttons">
              <button
                type="button"
                className={`type-button ${
                  goalType === "skill" ? "active" : ""
                }`}
                onClick={() => setGoalType("skill")}
              >
                <span className="button-icon">📊</span> Skill
              </button>
              <button
                type="button"
                className={`type-button ${goalType === "boss" ? "active" : ""}`}
                onClick={() => setGoalType("boss")}
              >
                <span className="button-icon">👹</span> Boss
              </button>
            </div>
          </div>

          <div className="form-group">
            {loadingMetrics ? (
              <div className="loading-indicator">Loading options...</div>
            ) : (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                required
                disabled={loadingMetrics}
                className="form-select"
                placeholder={`Select ${goalType}`}
              >
                <option value="">-- Select {goalType} --</option>
                {metrics.map((metric) => (
                  <option key={metric.metric} value={metric.metric}>
                    {metric.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentStats && (
            <div className="current-stats">
              <div className="stats-label">
                Current {goalType === "skill" ? "XP" : "Kills"}
              </div>
              <div className="stats-value">
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
            </div>
          )}
        </div>

        {/* Card-style Target Mode Selection */}
        <div className="form-group">
          <div className="option-cards">
            <button
              type="button"
              className={`option-card ${
                targetMode === "gain" ? "selected" : ""
              }`}
              onClick={() => setTargetMode("gain")}
            >
              <div className="option-card-icon">
                <FaArrowUp />
              </div>
              <div className="option-card-content">
                <span className="option-card-title">Gain Amount</span>
                <span className="option-card-description">
                  Add to current {goalType === "skill" ? "XP" : "kills"}
                </span>
              </div>
            </button>

            <button
              type="button"
              className={`option-card ${
                targetMode === "total" ? "selected" : ""
              }`}
              onClick={() => setTargetMode("total")}
            >
              <div className="option-card-icon">
                <FaTrophy />
              </div>
              <div className="option-card-content">
                <span className="option-card-title">Total Goal</span>
                <span className="option-card-description">
                  Set exact target {goalType === "skill" ? "XP" : "kills"}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-grow">
            <input
              type="number"
              className="form-input"
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
              placeholder={
                targetMode === "total" ? "Target value" : "Amount to gain"
              }
              required
            />
          </div>

          <div className="form-group flex-grow">
            <input
              type="date"
              className="form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              placeholder="Target date (optional)"
            />
          </div>
        </div>

        {/* Card-style Privacy Selection */}
        <div className="form-group">
          <div className="option-cards privacy-cards">
            <button
              type="button"
              className={`option-card ${!isPublic ? "selected" : ""}`}
              onClick={() => setIsPublic(false)}
            >
              <div className="option-card-icon">
                <FaLock />
              </div>
              <div className="option-card-content">
                <span className="option-card-title">Private</span>
                <span className="option-card-description">
                  Only visible to you
                </span>
              </div>
            </button>

            <button
              type="button"
              className={`option-card ${isPublic ? "selected" : ""}`}
              onClick={() => setIsPublic(true)}
            >
              <div className="option-card-icon">
                <FaGlobe />
              </div>
              <div className="option-card-content">
                <span className="option-card-title">Public</span>
                <span className="option-card-description">
                  Visible to other players
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading || !selectedMetric || !targetValue}
          >
            {loading ? "Creating..." : "Create Goal"}
          </button>
        </div>
      </form>
    </div>
  );
}
