import React, { useState, useEffect } from "react";
import { usePlayer } from "../../hooks/usePlayer"; // New hook for player stats
import { fetchFreshPlayerStats } from "../../services/playerRefresh";
import { useUserGoals } from "../../hooks/useUserGoals"; // New hook for goals
import { FaLock, FaGlobe, FaArrowUp, FaTrophy, FaTimes, FaStar } from "react-icons/fa";
import { titleize } from "../../utils/stringUtils";
import { MAX_LEVEL, hasLevels, levelForXp, xpForLevel } from "../../utils/skillLevels";
import MetricSelector from "../MetricSelector";

// Import UI components
import Button from "../ui/Button";
import Card from "../ui/Card";
import "./CreateGoal.css";

/**
 * Current XP (skill) or kill count (boss) for one metric, from WOM player
 * details. undefined when WOM has no entry for it. WOM reports -1 for a
 * metric below its ranking threshold, which is 0 for a goal's purposes.
 *
 * Shared by the "Current XP" box and submit, which used to disagree: the box
 * read currentStats.experience - a field the player object does not have -
 * so it always showed 0.
 */
export function currentValueOf(stats, goalType, metric) {
  const group = goalType === "skill" ? "skills" : "bosses";
  const field = goalType === "skill" ? "experience" : "kills";
  const value = stats?.latestSnapshot?.data?.[group]?.[metric]?.[field];
  return typeof value === "number" ? Math.max(0, value) : undefined;
}

export default function CreateGoal({
  player,
  userId,
  onGoalCreated,
  onCancel,
}) {
  // Form state
  const [goalType, setGoalType] = useState("skill");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState(null);
  // "level" (skills only: reach a level), "gain" (add XP or kills) or
  // "total" (reach an exact XP or kill count). Members think in levels, so a
  // skill goal starts on "level".
  const [targetMode, setTargetMode] = useState("level");
  const [isPublic, setIsPublic] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user has interacted with the form

  // The goal's starting value is recorded from these stats, so they must be
  // current: WOM's saved snapshot (usePlayer) can be hours or days old, and
  // XP gained since then would count as progress on the new goal. Ask WOM to
  // pull the hiscores as the form opens, and fall back to the saved snapshot
  // only if that fails.
  const { player: savedStats, loading: loadingSaved } = usePlayer(player.wom_id);
  const [fresh, setFresh] = useState({ status: "loading", stats: null });
  useEffect(() => {
    let cancelled = false;
    setFresh({ status: "loading", stats: null });
    fetchFreshPlayerStats(player.wom_id)
      .then((stats) => {
        if (!cancelled) setFresh({ status: stats.updated ? "fresh" : "saved", stats });
      })
      .catch(() => {
        if (!cancelled) setFresh({ status: "failed", stats: null });
      });
    return () => {
      cancelled = true;
    };
  }, [player.wom_id]);
  const currentStats = fresh.stats ?? (fresh.status === "failed" ? savedStats : null);
  const loadingStats = fresh.status === "loading" || (fresh.status === "failed" && loadingSaved);

  const { createGoal, loading: submitting } = useUserGoals(userId);

  // Set initial selected metric when metrics load
  const handleMetricChange = (metric) => {
    setSelectedMetric(metric);
    setHasInteracted(true); // User has now interacted with the form
    if (targetMode === "level" && metric && !hasLevels(metric)) {
      changeTargetMode("gain");
    }
  };

  // A level and an XP amount are different scales, so a value typed for one
  // mode would be wildly wrong in the other: 85 as a level is 3.2M XP.
  const changeTargetMode = (mode) => {
    if ((mode === "level") !== (targetMode === "level")) setTargetValue("");
    setTargetMode(mode);
    setHasInteracted(true);
  };

  // Clear any errors when switching goal types
  const handleGoalTypeChange = (type) => {
    setGoalType(type);
    setSelectedMetric(""); // Reset the metric when changing types
    if (type !== goalType) {
      setTargetMode(type === "skill" ? "level" : "gain");
      setTargetValue("");
    }
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
      setError(
        "Still getting your latest stats from WiseOldMan. Please wait a moment and try again."
      );
      return;
    }

    if (!currentStats) {
      setError(
        "Unable to load player statistics. Please try again or select a different skill/boss."
      );
      return;
    }

    // Number, not parseInt: a number box also accepts forms like ".5e2" (50),
    // which parseInt reads as NaN and would save a goal with no target.
    const targetValueInput = Number(targetValue);
    if (!Number.isInteger(targetValueInput)) {
      setError("Enter a whole number.");
      return;
    }
    let currentValue, startValue, actualTargetValue;

    if (goalType === "skill") {
      currentValue = currentValueOf(currentStats, "skill", selectedMetric);
      startValue = currentValue;

      if (currentValue === undefined) {
        setError(
          `Could not find current experience for ${selectedMetric}. Try selecting a different skill.`
        );
        return;
      }

      if (targetMode === "level") {
        const currentLevel = levelForXp(currentValue);
        if (targetValueInput > MAX_LEVEL) {
          setError(`The highest level is ${MAX_LEVEL}.`);
          return;
        }
        if (targetValueInput <= currentLevel) {
          setError(
            `You're already level ${currentLevel} in ${titleize(selectedMetric)}. Pick a higher level.`
          );
          return;
        }
        // Stored and tracked as XP like any other skill goal.
        actualTargetValue = xpForLevel(targetValueInput);
      } else {
        actualTargetValue =
          targetMode === "total"
            ? targetValueInput
            : currentValue + targetValueInput;
      }
    } else {
      // 0 kills is a valid starting point for a boss goal; only a boss WOM
      // has no entry for is an error.
      currentValue = currentValueOf(currentStats, "boss", selectedMetric);
      startValue = currentValue;

      if (currentValue === undefined) {
        setError(
          `Could not find current kill count for ${selectedMetric}. Try selecting a different boss.`
        );
        return;
      }

      // Calculate the target value based on mode
      actualTargetValue =
        targetMode === "total"
          ? targetValueInput
          : currentValue + targetValueInput;
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

  // Values the form shows while it is filled in.
  const levelsOffered = goalType === "skill" && (!selectedMetric || hasLevels(selectedMetric));
  const currentValue = selectedMetric
    ? currentValueOf(currentStats, goalType, selectedMetric)
    : undefined;
  const currentLevel =
    goalType === "skill" && currentValue !== undefined ? levelForXp(currentValue) : undefined;
  const typedLevel = Number(targetValue);
  const levelTargetXp =
    targetMode === "level" && Number.isInteger(typedLevel) && typedLevel >= 1 && typedLevel <= MAX_LEVEL
      ? xpForLevel(typedLevel)
      : null;

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
              playerId={player.wom_id} // Pass the player ID to fetch metrics
              metricType={goalType} // Pass the metric type ("skill" or "boss")
              selectedMetric={selectedMetric} // The currently selected metric
              onMetricChange={handleMetricChange} // Callback to update the selected metric
              disabled={false} // Enable the dropdown
              required={true} // Make the field required
              placeholderText={`Select a ${goalType}`} // Dynamic placeholder text
            />
          </div>

          {/* Only show loading indicator or stats after a metric has been selected */}
          {selectedMetric &&
            (loadingStats ? (
              <div className="ui-loading-indicator">
                <div className="ui-loading-spinner"></div>
                <div className="ui-loading-text">Getting your latest stats from WiseOldMan...</div>
              </div>
            ) : currentStats ? (
              <Card variant="dark" className="ui-current-stats">
                <Card.Body>
                  <div className="ui-stats-label">
                    Current {goalType === "skill" ? "XP" : "Kills"}
                  </div>
                  <div className="ui-stats-value">
                    {currentValueOf(currentStats, goalType, selectedMetric)?.toLocaleString() ?? "-"}
                  </div>
                  {goalType === "skill" && hasLevels(selectedMetric) &&
                    currentValueOf(currentStats, "skill", selectedMetric) !== undefined && (
                      <div className="ui-stats-level">
                        Level {levelForXp(currentValueOf(currentStats, "skill", selectedMetric))}
                      </div>
                    )}
                  {fresh.status !== "fresh" && (
                    <div className="ui-stats-note" role="note">
                      WiseOldMan could not fetch your latest hiscores just now, so
                      this is its last saved number and may be behind.
                    </div>
                  )}
                </Card.Body>
              </Card>
            ) : hasInteracted ? (
              <div className="ui-message ui-message-warning">
                <span>
                  Could not load stats for {selectedMetric}. Please try a
                  different {goalType}.
                </span>
              </div>
            ) : null)}
        </div>

        {/* Target Mode Selection */}
        <div className="ui-form-group">
          <label className="ui-form-label">Target Type</label>
          <div className={`ui-option-cards ${levelsOffered ? "ui-option-cards-3" : ""}`}>
            {levelsOffered && (
              <Card
                className={`ui-option-card ${
                  targetMode === "level" ? "ui-selected" : ""
                }`}
                onClick={() => changeTargetMode("level")}
                variant={targetMode === "level" ? "primary" : "dark"}
                clickable
              >
                <Card.Body className="ui-option-card-body">
                  <div className="ui-option-card-icon">
                    <FaStar />
                  </div>
                  <div className="ui-option-card-content">
                    <span className="ui-option-card-title">Reach Level</span>
                    <span className="ui-option-card-description">
                      Pick the level you want
                    </span>
                  </div>
                </Card.Body>
              </Card>
            )}

            <Card
              className={`ui-option-card ${
                targetMode === "gain" ? "ui-selected" : ""
              }`}
              onClick={() => changeTargetMode("gain")}
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
              onClick={() => changeTargetMode("total")}
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
            <label className="ui-form-label" htmlFor="goal-target-value">
              {targetMode === "level"
                ? "Target Level"
                : targetMode === "total"
                  ? "Target Value"
                  : "Amount to Gain"}
            </label>
            <input
              id="goal-target-value"
              type="number"
              className="ui-form-input"
              min={
                // The player object has no top-level experience or kills, so
                // this used to be 1 whatever the current value was.
                targetMode === "level"
                  ? Math.min(MAX_LEVEL, (currentLevel ?? 1) + 1)
                  : targetMode === "total"
                    ? (currentValue ?? 0) + 1
                    : 1
              }
              max={targetMode === "level" ? MAX_LEVEL : undefined}
              value={targetValue}
              onChange={(e) => {
                setTargetValue(e.target.value);
                setHasInteracted(true);
              }}
              required
            />
            {levelTargetXp !== null && (
              <div className="ui-form-hint">
                {levelTargetXp.toLocaleString()} XP
                {currentValue !== undefined && levelTargetXp > currentValue &&
                  ` (${(levelTargetXp - currentValue).toLocaleString()} to go)`}
              </div>
            )}
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
