import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../../supabaseClient";
import { fetchWomMetrics, fetchPlayerStats } from "../../utils/womApi";

export default function CreateGoal({ player, userId, onGoalCreated, onCancel }) {
  const [goalType, setGoalType] = useState('skill');
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [currentStats, setCurrentStats] = useState(null);
  const [error, setError] = useState(null);
  const [targetMode, setTargetMode] = useState('total');
  
  // Use useCallback to memoize fetchStats to prevent unnecessary re-renders
  const fetchStats = useCallback(async () => {
    try {
      const stats = await fetchPlayerStats(player.wom_id, goalType, selectedMetric);
      console.log("Received stats:", stats);
      setCurrentStats(stats);
      
      // Set a default target value (10% increase for skills, 100 more kills for bosses)
      let defaultTarget;
      
      if (goalType === 'skill') {
        // Make sure experience is valid
        const experience = stats.experience || 0;
        defaultTarget = Math.max(Math.floor(experience * 1.1), experience + 1000); // 10% more XP or at least 1000 XP
      } else {
        // Make sure kills is valid
        const kills = stats.kills || 0;
        defaultTarget = Math.max(kills + 100, 100); // 100 more kills or at least 100 kills
      }
      
      setTargetValue(defaultTarget.toString());
    } catch (err) {
      console.error('Error fetching player stats:', err);
      // Set some default values
      setCurrentStats(goalType === 'skill' ? { experience: 0 } : { kills: 0 });
      setTargetValue(goalType === 'skill' ? "1000" : "100");
    }
  }, [player.wom_id, goalType, selectedMetric]); // Add dependencies for useCallback
  
  // Fetch metrics (skills, bosses) from WOM API
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoadingMetrics(true);
        const metricsData = await fetchWomMetrics(goalType);
        setMetrics(metricsData);
        setSelectedMetric(metricsData[0]?.metric || '');
      } catch (err) {
        console.error('Error loading metrics:', err);
        setError('Failed to load metrics');
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
      setError('Please fill out all required fields');
      return;
    }
    
    const targetValueInput = parseInt(targetValue, 10);
    let currentValue, startValue, actualTargetValue;
    
    if (goalType === 'skill') {
      currentValue = currentStats.experience;
      startValue = currentStats.experience;
      
      // Calculate the target value based on mode
      if (targetMode === 'total') {
        actualTargetValue = targetValueInput; 
      } else {
        actualTargetValue = currentValue + targetValueInput;
      }
    } else {
      currentValue = currentStats.kills;
      startValue = currentStats.kills;
      
      // Calculate the target value based on mode
      if (targetMode === 'total') {
        actualTargetValue = targetValueInput;
      } else {
        actualTargetValue = currentValue + targetValueInput;
      }
    }
    
    // Validation depends on target mode
    if (targetMode === 'total' && actualTargetValue <= startValue) {
      setError('Target value must be greater than current value');
      return;
    } else if (targetMode === 'gain' && targetValueInput <= 0) {
      setError('Gain must be greater than zero');
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
        target_date: targetDate || null
      };
      
      const { data, error } = await supabase
        .from('user_goals')
        .insert([goalData])
        .select();
        
      if (error) throw error;
      
      onGoalCreated(data[0]);
    } catch (err) {
      console.error('Error creating goal:', err);
      setError('Failed to create goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="create-goal-container">
      <h3>Create New Goal</h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Goal Type:</label>
          <div className="goal-type-buttons">
            <button
              type="button"
              className={`type-button ${goalType === "skill" ? "active" : ""}`}
              onClick={() => setGoalType("skill")}
            >
              Skill
            </button>
            <button
              type="button"
              className={`type-button ${goalType === "boss" ? "active" : ""}`}
              onClick={() => setGoalType("boss")}
            >
              Boss
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>
            {goalType === "skill" ? "Select Skill:" : "Select Boss:"}
          </label>
          {loadingMetrics ? (
            <div className="loading-indicator">Loading options...</div>
          ) : (
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              required
              disabled={loadingMetrics}
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
              Current {goalType === "skill" ? "XP" : "Kills"}:
            </div>
            <div className="stats-value">
              {goalType === "skill"
                ? currentStats.experience.toLocaleString()
                : currentStats.kills.toLocaleString()}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Target Type:</label>
          <div className="target-mode-selector">
            <label className="radio-label">
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === "total"}
                onChange={() => setTargetMode("total")}
              />
              Total {goalType === "skill" ? "XP" : "Kills"} Goal
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === "gain"}
                onChange={() => setTargetMode("gain")}
              />
              {goalType === "skill" ? "XP" : "Kills"} to Gain
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label>
            {targetMode === 'total' 
              ? `Target ${goalType === 'skill' ? 'XP' : 'Kills'}:` 
              : `${goalType === 'skill' ? 'XP' : 'Kills'} to Gain:`}
          </label>
          <input
            type="number"
            min={targetMode === 'total' 
              ? (currentStats ? (goalType === 'skill' ? currentStats.experience + 1 : currentStats.kills + 1) : 1)
              : 1}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={targetMode === 'total' ? "Enter target value" : "Enter amount to gain"}
            required
          />
        </div>

        <div className="form-group">
          <label>Target Date (Optional):</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

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
