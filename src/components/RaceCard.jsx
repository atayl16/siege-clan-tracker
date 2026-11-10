import React, { useState } from 'react';
import { FaLock, FaGlobe, FaCalendarAlt, FaTrophy, FaSyncAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { titleize, displayUsername } from '../utils/stringUtils';
import { formatDistanceToNow } from 'date-fns';
import './RaceCard.css';

import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

/**
 * @param {object} props
 * @param {object} props.race - a row from useRaces, participants embedded
 * @param {boolean} [props.isOwner]
 * @param {(raceId: string) => Promise<{ results?: Array }>} [props.onRefresh] -
 *   shows a Refresh button on active races; pass it only for signed-in members
 */
export default function RaceCard({ race, isOwner, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState(null);

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
    // The winner (first to reach their target) leads, then by progress.
    .sort((a, b) => (b.is_winner === true) - (a.is_winner === true) || b.progressPercent - a.progressPercent);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const createdAt = formatDate(race.created_at);

  // updated_at is stamped every time progress is checked against WiseOldMan,
  // so the newest one is when this race was last brought up to date.
  const lastChecked = participants
    .filter((p) => p.baseline_set_at && p.updated_at)
    .map((p) => p.updated_at)
    .sort()
    .pop();
  const isActive = race.status === undefined || race.status === "active";

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const body = await onRefresh(race.id);
      const result = body?.results?.find((r) => r.raceId === race.id);
      if (result?.status === "recently_refreshed") {
        setRefreshNote(`Already up to date. Try again in ${result.retryAfterSeconds}s.`);
      }
    } catch (err) {
      setRefreshNote(err.message);
    } finally {
      setRefreshing(false);
    }
  };
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
            <span className="ui-race-date">
              Created {createdAt}
              {race.creator_name && (
                <>
                  {" by "}
                  <span className="ui-race-creator">{displayUsername(race.creator_name)}</span>
                </>
              )}
            </span>
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
                  {participant.is_winner && (
                    <FaTrophy className="ui-participant-winner" aria-label="Winner" />
                  )}
                  {participant.player_name}
                </span>
                <span className="ui-participant-metric">
                  {titleize(participant.metric)}
                </span>
              </div>

              <ProgressBar
                value={participant.progressPercent}
                label={`+${(participant.current_value ?? 0).toLocaleString()} / ${(participant.target_value ?? 0).toLocaleString()}`}
                variant={index === 0 ? "success" : "primary"}
              />
              {/* null (not undefined): the column exists and nothing has
                  recorded this participant's starting point yet. Opening the
                  page or pressing Refresh records it. */}
              {participant.baseline_set_at === null && (
                <span className="ui-participant-pending">Starting point not recorded yet</span>
              )}
            </div>
          ))}
        </div>

        {isActive && (lastChecked || onRefresh) && (
          <div className="ui-race-refresh">
            {lastChecked && (
              <span className="ui-race-updated">Updated {formatDate(lastChecked)}</span>
            )}
            {onRefresh && (
              <button
                type="button"
                className="ui-race-refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <FaSyncAlt className={refreshing ? "ui-spin" : undefined} aria-hidden="true" />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}
            {refreshNote && (
              <span className="ui-race-refresh-note" role="status">{refreshNote}</span>
            )}
          </div>
        )}

        {endDate && (
          <div className="ui-race-footer">
            <span className="ui-race-end-date">
              <FaCalendarAlt /> {race.status === "completed" ? "Ended" : "Ends"} {endDate}
            </span>
          </div>
        )}
      </Card.Body>

      {/* Callers pass isOwner from canEditRace (utils/races.js), the single
          rule for who may edit. */}
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
