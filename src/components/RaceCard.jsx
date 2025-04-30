import React from 'react';
import { FaLock, FaGlobe, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './RaceCard.css';

import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

export default function RaceCard({ race, isOwner }) {
  // Calculate overall progress for each participant
  const participants = race.race_participants || [];
  
  participants.forEach(p => {
    p.progressPercent = p.target_value > 0 
      ? Math.min(100, Math.round((p.current_value / p.target_value) * 100))
      : 0;
  });
  
  // Sort by progress
  const sortedParticipants = [...participants].sort((a, b) => b.progressPercent - a.progressPercent);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const createdAt = formatDate(race.created_at);
  const endDate = race.end_date ? formatDate(race.end_date) : null;

  return (
    <Card className="ui-race-card">
      <Card.Header className="ui-race-header">
        <div className="ui-race-header-content">
          <Link to={`/races/${race.id}`} className="ui-race-title">
            {race.title}
          </Link>
          <div className="ui-race-meta">
            {race.public ? (
              <span className="ui-race-visibility ui-public">
                <FaGlobe /> Public
              </span>
            ) : (
              <span className="ui-race-visibility ui-private">
                <FaLock /> Private
              </span>
            )}
            <span className="ui-race-date">Created {createdAt}</span>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {race.description && (
          <p className="ui-race-description">{race.description}</p>
        )}

        <div className="ui-race-participants">
          {sortedParticipants.map((participant, index) => (
            <div
              key={participant.id}
              className={`ui-race-participant ${index === 0 ? "leader" : ""}`}
            >
              <div className="ui-participant-header">
                <span className="ui-participant-name">
                  {participant.player_name}
                </span>
                <span className="ui-participant-metric">
                  {participant.metric.replace(/_/g, " ")}
                </span>
              </div>

              <ProgressBar
                value={participant.progressPercent}
                label={`${participant.current_value.toLocaleString()} / ${participant.target_value.toLocaleString()}`}
                variant={index === 0 ? "success" : "primary"}
              />
            </div>
          ))}
        </div>

        {endDate && (
          <div className="ui-race-footer">
            <span className="ui-race-end-date">
              <FaCalendarAlt /> Ends {endDate}
            </span>
          </div>
        )}
      </Card.Body>

      {isOwner && (
        <Card.Footer className="ui-race-actions">
          <Link to={`/races/${race.id}/edit`} className="ui-btn ui-btn-text">
            Edit Race
          </Link>
        </Card.Footer>
      )}
    </Card>
  );
}
