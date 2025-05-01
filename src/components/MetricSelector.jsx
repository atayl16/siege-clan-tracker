import React from "react";
import { useMetrics } from "../hooks/useMetrics"; // Use the updated hook
import "./MetricSelector.css";

export default function MetricSelector({ 
  playerId, // Pass the player ID to fetch metrics
  metricType, // "skill", "boss", "activity", or "computed"
  selectedMetric,
  onMetricChange,
  className = "",
  disabled = false,
  required = true,
  placeholderText
}) {
  const { metrics, loading: loadingMetrics } = useMetrics(playerId, metricType); // Use the updated hook

  const handleMetricChange = (e) => {
    if (onMetricChange) {
      onMetricChange(e.target.value);
    }
  };

  const getPlaceholderText = () => {
    if (placeholderText) {
      return placeholderText;
    }
    return `-- Select ${metricType} --`;
  };

  return (
    <div className={`ui-metric-selector ${className}`}>
      {loadingMetrics ? (
        <div className="ui-loading-indicator">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading options...</div>
        </div>
      ) : (
        <select
          value={selectedMetric}
          onChange={handleMetricChange}
          required={required}
          disabled={disabled || loadingMetrics}
          className="ui-form-select"
        >
          <option value="">{getPlaceholderText()}</option>
          {metrics?.map((metric) => (
            <option key={metric.metric} value={metric.metric}>
              {metric.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
