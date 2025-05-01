import React, { useState } from 'react';
import { FaPlus, FaTimes, FaGlobe, FaLock } from 'react-icons/fa';
import { useRaces } from '../hooks/useRaces'; // Updated to use new hook
import MemberSelector from './MemberSelector';
import MetricSelector from './MetricSelector';
import './CreateRace.css';

import Button from './ui/Button';
import Card from './ui/Card';

export default function CreateRace({ userId, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState([
    {
      playerId: "",
      playerName: "",
      metricType: "skill",
      metric: "",
      targetValue: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { createRace } = useRaces(); // Use the new hook

  const handleAddParticipant = () => {
    setParticipants([
      ...participants,
      {
        playerId: "",
        playerName: "",
        metricType: "skill",
        metric: "",
        targetValue: "",
      },
    ]);
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
    handleParticipantChange(index, "metricType", type);
    handleParticipantChange(index, "metric", "");
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

    setIsSubmitting(true);
    setError(null);

    try {
      const raceData = {
        creator_id: userId,
        title,
        description,
        public: isPublic,
        end_date: endDate || null,
        participants: participants.map((p) => ({
          wom_id: p.playerId,
          player_name: p.playerName,
          metric: p.metric,
          target_value: parseInt(p.targetValue, 10),
        })),
      };

      const result = await createRace(raceData);

      if (result.id) {
        onCreated(result);
      }
    } catch (err) {
      setError(`Failed to create race: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="ui-race-form">
      <Card.Header>
        <h3 className="ui-race-form-title">Create New Race</h3>
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
              min={new Date().toISOString().split("T")[0]}
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
                    metricType={participant.metricType}
                    selectedMetric={participant.metric}
                    onMetricChange={(metric) =>
                      handleParticipantChange(index, "metric", metric)
                    }
                    disabled={!participant.playerId}
                    placeholderText="Select metric"
                  />
                </div>

                <div className="ui-form-group ui-form-group-half">
                  <label className="ui-form-label">Target Value</label>
                  <input
                    type="number"
                    className="ui-form-input"
                    value={participant.targetValue}
                    onChange={(e) =>
                      handleParticipantChange(
                        index,
                        "targetValue",
                        e.target.value
                      )
                    }
                    disabled={!participant.metric}
                    placeholder="Target value"
                    min="1"
                    required
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
              {isSubmitting ? "Creating..." : "Create Race"}
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}
