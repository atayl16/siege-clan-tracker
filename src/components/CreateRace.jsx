import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaPlus, FaTimes, FaGlobe, FaLock } from 'react-icons/fa';
import { useRaces } from '../hooks/useRaces'; // Updated to use new hook
import { useAuth } from '../context/AuthContext';
import MemberSelector from './MemberSelector';
import MetricSelector from './MetricSelector';
import './CreateRace.css';

import Button from './ui/Button';
import Card from './ui/Card';
import { mainFirst } from "../utils/characters";
import { titleize } from "../utils/stringUtils";
import { MAX_LEVEL, SKILL_METRICS, hasLevels, levelForXp, xpForLevel } from "../utils/skillLevels";
import { fetchFreshPlayerStats } from "../services/playerRefresh";
import { fetchPlayerStats } from "../services/goalProgressService";

/**
 * A row's target is either "gain" (XP or kills to gain, which is what
 * race_participants.target_value stores) or, for a skill, "level": the level
 * to reach, turned into the XP gain it needs when the race is saved.
 */
const newRow = () => ({
  playerId: "",
  playerName: "",
  metricType: "skill",
  metric: "",
  targetMode: "level",
  targetValue: "",
});

/** A saved race_participants row, as the form's editable row. */
function toFormRow(p) {
  return {
    id: p.id,
    playerId: p.wom_id,
    playerName: p.player_name,
    metricType: SKILL_METRICS.has(p.metric) ? "skill" : "boss",
    metric: p.metric,
    // Only the gain is saved, so a saved row opens as one.
    targetMode: "gain",
    targetValue: String(p.target_value ?? ""),
    // Its starting point, which a level target on this row is measured from
    // while the character and metric stay the same (updateRace keeps it).
    saved: p.baseline_set_at
      ? { womId: Number(p.wom_id), metric: p.metric, startValue: p.start_value ?? 0 }
      : null,
  };
}

const isLevelRow = (row) =>
  row.targetMode === "level" && row.metricType === "skill" && hasLevels(row.metric);

/** True when the row's level target is measured from its saved starting point. */
const usesSavedStart = (row) =>
  Boolean(row.saved) && row.saved.womId === Number(row.playerId) && row.saved.metric === row.metric;

/**
 * Create a race, or - given `race` - edit it. Editing reuses the same fields
 * and validation; who may edit is decided by canEditRace (utils/races.js) on
 * the edit page, and enforced by RLS.
 */
export default function CreateRace({ userId, race = null, onCreated, onCancel }) {
  const isEditing = Boolean(race);
  const [title, setTitle] = useState(race?.title ?? "");
  const [description, setDescription] = useState(race?.description ?? "");
  const [isPublic, setIsPublic] = useState(race?.public ?? false);
  const savedEndDate = race?.end_date ? race.end_date.slice(0, 10) : "";
  const [endDate, setEndDate] = useState(savedEndDate);
  // New end dates must not be in the past, but an ended race's saved date
  // has to stay valid while it is unchanged, or none of its other fields
  // could be saved. Any other date picked must still be today or later.
  const today = new Date().toISOString().split("T")[0];
  const minEndDate =
    isEditing && savedEndDate && savedEndDate < today && endDate === savedEndDate
      ? savedEndDate
      : today;
  const savedParticipants = race?.participants ?? race?.race_participants ?? [];
  const [participants, setParticipants] = useState(
    savedParticipants.length
      ? savedParticipants.map(toFormRow)
      : [newRow()]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { createRace, updateRace } = useRaces(); // Use the new hook

  // The creator's own claimed characters. A race only makes sense with at
  // least one of them in it, so the first row starts as one of them and
  // submit refuses a race that has none.
  const { userClaims } = useAuth();
  const myCharacters = useMemo(
    () =>
      // Main character first, so it is the one the first row starts as.
      mainFirst(userClaims)
        .map((claim) => ({
          wom_id: Number(claim.wom_id ?? claim.members?.wom_id),
          name: claim.members?.name ?? claim.name,
        }))
        .filter((c) => Number.isFinite(c.wom_id)),
    [userClaims]
  );

  // Claims load asynchronously, so fill the first row once they arrive -
  // but only while it is still untouched.
  useEffect(() => {
    if (isEditing || !myCharacters.length) return;
    setParticipants((rows) =>
      rows.length === 1 && !rows[0].playerId
        ? [{ ...rows[0], playerId: myCharacters[0].wom_id, playerName: myCharacters[0].name }]
        : rows
    );
  }, [myCharacters, isEditing]);

  const handleAddParticipant = () => {
    setParticipants([...participants, newRow()]);
  };

  const handleRemoveParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index][field] = value;
    setParticipants(updatedParticipants);
  };

  const handleSelectPlayer = (index, player) => {
    handleParticipantChange(index, "playerId", player.wom_id);
    handleParticipantChange(
      index,
      "playerName",
      player.name || player.wom_name
    );
  };

  const handleMetricTypeChange = (index, type) => {
    const row = participants[index];
    handleParticipantChange(index, "metricType", type);
    handleParticipantChange(index, "metric", "");
    if (type !== row.metricType) {
      handleParticipantChange(index, "targetMode", type === "skill" ? "level" : "gain");
      handleParticipantChange(index, "targetValue", "");
    }
  };

  const handleMetricChange = (index, metric) => {
    handleParticipantChange(index, "metric", metric);
    // Overall's "level" is the total level, which has no XP table.
    if (participants[index].targetMode === "level" && metric && !hasLevels(metric)) {
      handleTargetModeChange(index, "gain");
    }
  };

  // A level and an XP amount are different scales: 85 as a level is 3.2M XP.
  const handleTargetModeChange = (index, mode) => {
    if (participants[index].targetMode === mode) return;
    handleParticipantChange(index, "targetMode", mode);
    handleParticipantChange(index, "targetValue", "");
  };

  // Current skills per character, for rows with a level target and no saved
  // starting point. Fresh from the hiscores, like the starting point the race
  // records when it is created, so the XP gain worked out here matches it;
  // WOM's saved snapshot only if that fails, as the race itself would.
  const [skillsByPlayer, setSkillsByPlayer] = useState({});
  const neededPlayers = [
    ...new Set(
      participants
        .filter((row) => row.playerId && isLevelRow(row) && !usesSavedStart(row))
        .map((row) => Number(row.playerId))
    ),
  ];
  const neededKey = neededPlayers.join(",");
  const requested = useRef(new Set());
  useEffect(() => {
    neededPlayers
      .filter((womId) => !requested.current.has(womId))
      .forEach((womId) => {
        requested.current.add(womId);
        setSkillsByPlayer((now) => ({ ...now, [womId]: { status: "loading" } }));
        fetchFreshPlayerStats(womId)
          .catch(() => fetchPlayerStats(womId))
          .then((stats) =>
            setSkillsByPlayer((now) => ({
              ...now,
              [womId]: { status: "ready", skills: stats?.latestSnapshot?.data?.skills ?? {} },
            }))
          )
          .catch(() => setSkillsByPlayer((now) => ({ ...now, [womId]: { status: "failed" } })));
      });
    // neededKey stands for neededPlayers, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neededKey]);

  /** The XP a level target is measured from, or undefined while unknown. */
  const startXpFor = (row) => {
    if (usesSavedStart(row)) return row.saved.startValue;
    const xp = skillsByPlayer[Number(row.playerId)]?.skills?.[row.metric]?.experience;
    return typeof xp === "number" ? Math.max(0, xp) : undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (participants.some((p) => !p.playerId || !p.metric || !p.targetValue)) {
      setError("All participant details must be complete");
      return;
    }

    // Number, not parseInt: a number box also accepts forms like ".85e2".
    if (participants.some((p) => !Number.isInteger(Number(p.targetValue)) || Number(p.targetValue) < 1)) {
      setError("Targets must be whole numbers above zero.");
      return;
    }

    // A level target becomes the XP gain it needs from the racer's start.
    const targets = [];
    for (const p of participants) {
      if (!isLevelRow(p)) {
        targets.push(Number(p.targetValue));
        continue;
      }
      const level = Number(p.targetValue);
      const startXp = startXpFor(p);
      const name = p.playerName || "this racer";
      if (startXp === undefined) {
        setError(
          skillsByPlayer[Number(p.playerId)]?.status === "failed"
            ? `Could not get ${name}'s current XP. Set an XP gain instead.`
            : `Still getting ${name}'s current XP. Try again in a moment.`
        );
        return;
      }
      if (level > MAX_LEVEL) {
        setError(`The highest level is ${MAX_LEVEL}.`);
        return;
      }
      const currentLevel = levelForXp(startXp);
      if (level <= currentLevel) {
        setError(`${name} is already level ${currentLevel} in ${titleize(p.metric)}. Pick a higher level.`);
        return;
      }
      targets.push(xpForLevel(level) - startXp);
    }

    if (!myCharacters.length) {
      setError("Claim one of your characters before creating a race.");
      return;
    }

    const mine = new Set(myCharacters.map((c) => c.wom_id));
    if (!participants.some((p) => mine.has(Number(p.playerId)))) {
      setError("Include at least one of your own characters in the race.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const raceData = {
        title,
        description,
        public: isPublic,
        end_date: endDate || null,
        participants: participants.map((p, i) => ({
          ...(p.id ? { id: p.id } : {}),
          wom_id: p.playerId,
          player_name: p.playerName,
          metric: p.metric,
          target_value: targets[i],
        })),
      };

      if (isEditing) {
        await updateRace(race.id, {
          ...raceData,
          originalParticipantIds: savedParticipants.map((p) => p.id),
        });
        onCreated(race);
        return;
      }

      const result = await createRace({ creator_id: userId, ...raceData });

      if (result.id) {
        onCreated(result);
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? "save" : "create"} race: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="ui-race-form">
      <Card.Header>
        <h3 className="ui-race-form-title">{isEditing ? "Edit Race" : "Create New Race"}</h3>
        <Button
          variant="text"
          size="sm"
          icon={<FaTimes />}
          onClick={onCancel}
        />
      </Card.Header>

      <Card.Body>
        <form onSubmit={handleSubmit}>
          {error && <div className="ui-form-error">{error}</div>}

          <div className="ui-form-group">
            <label className="ui-form-label">Race Title</label>
            <input
              type="text"
              className="ui-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Woodcutting Challenge"
              required
            />
          </div>

          <div className="ui-form-group">
            <label className="ui-form-label">Description (Optional)</label>
            <textarea
              className="ui-form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the race"
              rows={2}
            />
          </div>

          <div className="ui-form-group">
            <label className="ui-form-label">End Date (Optional)</label>
            <input
              type="date"
              className="ui-form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={minEndDate}
            />
          </div>

          <div className="ui-form-group">
            <label className="ui-form-label">Privacy</label>
            <div className="ui-toggle-container">
              <button
                type="button"
                className={`ui-toggle-button ${!isPublic ? "active" : ""}`}
                onClick={() => setIsPublic(false)}
              >
                <FaLock /> Private
              </button>
              <button
                type="button"
                className={`ui-toggle-button ${isPublic ? "active" : ""}`}
                onClick={() => setIsPublic(true)}
              >
                <FaGlobe /> Public
              </button>
            </div>
          </div>

          <h4 className="ui-section-title">Participants</h4>

          {participants.map((participant, index) => (
            <div key={index} className="ui-participant-card">
              <div className="ui-participant-header">
                <h5>Participant {index + 1}</h5>
                {participants.length > 1 && (
                  <Button
                    variant="text"
                    size="sm"
                    icon={<FaTimes />}
                    onClick={() => handleRemoveParticipant(index)}
                  />
                )}
              </div>

              <div className="ui-form-group">
                <label className="ui-form-label">Select Player</label>
                <MemberSelector
                  selectedMemberId={participant.playerId}
                  selectedMemberName={participant.playerName}
                  onMemberSelect={(player) => handleSelectPlayer(index, player)}
                />
              </div>

              <div className="ui-form-row">
                <div className="ui-form-group">
                  <label className="ui-form-label">Metric Type</label>
                  <div className="ui-toggle-container">
                    <button
                      type="button"
                      className={`ui-toggle-button ${
                        participant.metricType === "skill" ? "active" : ""
                      }`}
                      onClick={() => handleMetricTypeChange(index, "skill")}
                    >
                      Skill
                    </button>
                    <button
                      type="button"
                      className={`ui-toggle-button ${
                        participant.metricType === "boss" ? "active" : ""
                      }`}
                      onClick={() => handleMetricTypeChange(index, "boss")}
                    >
                      Boss
                    </button>
                  </div>
                </div>
              </div>

              <div className="ui-form-row">
                <div className="ui-form-group ui-form-group-half">
                  <label className="ui-form-label">Select Metric</label>
                  <MetricSelector
                    playerId={participant.playerId} // Pass the playerId to fetch metrics
                    metricType={participant.metricType} // Pass the metricType ("skill" or "boss")
                    selectedMetric={participant.metric} // The currently selected metric
                    onMetricChange={(metric) => handleMetricChange(index, metric)}
                    disabled={!participant.playerId} // Disable if no player is selected
                    placeholderText="Select metric"
                  />
                </div>

                <div className="ui-form-group ui-form-group-half">
                  {participant.metricType === "skill" && hasLevels(participant.metric || "skill") ? (
                    <div className="ui-toggle-container ui-target-mode" role="group" aria-label="Target type">
                      <button
                        type="button"
                        className={`ui-toggle-button ${participant.targetMode === "level" ? "active" : ""}`}
                        onClick={() => handleTargetModeChange(index, "level")}
                      >
                        Level
                      </button>
                      <button
                        type="button"
                        className={`ui-toggle-button ${participant.targetMode === "gain" ? "active" : ""}`}
                        onClick={() => handleTargetModeChange(index, "gain")}
                      >
                        XP Gain
                      </button>
                    </div>
                  ) : (
                    <label className="ui-form-label" htmlFor={`race-target-${index}`}>
                      {participant.metricType === "boss" ? "Kills to Gain" : "XP to Gain"}
                    </label>
                  )}
                  <RaceTarget
                    row={participant}
                    index={index}
                    startXp={isLevelRow(participant) && participant.playerId ? startXpFor(participant) : undefined}
                    status={skillsByPlayer[Number(participant.playerId)]?.status}
                    onChange={(value) => handleParticipantChange(index, "targetValue", value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={handleAddParticipant}
            icon={<FaPlus />}
            className="ui-add-participant-btn"
          >
            Add Participant
          </Button>

          <div className="ui-form-actions">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                participants.some(
                  (p) => !p.playerId || !p.metric || !p.targetValue
                ) ||
                !title
              }
            >
              {isSubmitting
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save Changes" : "Create Race"}
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}

/**
 * One racer's target box. For a level target it also says the racer's level
 * now and the XP gain the chosen level needs, which is what gets saved.
 */
function RaceTarget({ row, index, startXp, status, onChange }) {
  const levelRow = isLevelRow(row);
  const currentLevel = startXp === undefined ? undefined : levelForXp(startXp);
  const typed = Number(row.targetValue);

  let hint = null;
  if (levelRow && row.metric && row.playerId) {
    if (startXp === undefined) {
      hint = status === "failed" ? "Could not get current XP. Use XP Gain instead." : "Getting current XP...";
    } else if (Number.isInteger(typed) && typed > currentLevel && typed <= MAX_LEVEL) {
      hint = `Level ${currentLevel} now. Level ${typed} is +${(xpForLevel(typed) - startXp).toLocaleString()} XP.`;
    } else {
      hint = `Level ${currentLevel} now (${startXp.toLocaleString()} XP).`;
    }
  }

  return (
    <>
      <input
        id={`race-target-${index}`}
        type="number"
        className="ui-form-input"
        aria-label={levelRow ? "Target level" : "Target value"}
        value={row.targetValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={!row.metric}
        placeholder={levelRow ? "Target level" : "Target value"}
        min={levelRow ? Math.min(MAX_LEVEL, (currentLevel ?? 1) + 1) : 1}
        max={levelRow ? MAX_LEVEL : undefined}
        required
      />
      {hint && <div className="ui-form-hint ui-race-level-hint">{hint}</div>}
    </>
  );
}
