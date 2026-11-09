import React from 'react';
import { FaLock, FaGlobe, FaCalendarAlt } from 'react-icons/fa';
import { titleize } from '../utils/stringUtils';
import { formatDistanceToNow } from 'date-fns';
import './RaceCard.css';

import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

export default function RaceCard({ race, isOwner }) {
  // useRaces embeds participants as `participants`
  // (select("*, participants:race_participants(*)")). This read
  // race.race_participants, which is never set, so every card showed no one.
  const participants = race.participants || race.race_participants || [];

  // Progress per participant, without mutating the rows the hook owns.
  const sortedParticipants = participants
    .map((p) => ({
      ...p,
      progressPercent:
        p.target_value > 0
          ? Math.min(100, Math.round(((p.current_value ?? 0) / p.target_value) * 100))
          : 0,
    }))
    .sort((a, b) => b.progressPercent - a.progressPercent);
  
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
          {/* Plain text, not a link: there is no /races/:id page, so the link
              led to the 404. */}
          <span className="ui-race-title">{race.title}</span>
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
                  {titleize(participant.metric)}
                </span>
              </div>

              <ProgressBar
                value={participant.progressPercent}
                label={`${(participant.current_value ?? 0).toLocaleString()} / ${(participant.target_value ?? 0).toLocaleString()}`}
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

      {/* "Edit Race" linked to /races/:id/edit, which has no route either.
          Hidden until an edit page exists; isOwner is kept for it. */}
    </Card>
  );
}
