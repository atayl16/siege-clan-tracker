import React from "react";
import { FaTrophy } from "react-icons/fa";
import { usePlayerEvents } from "../hooks/usePlayerEvents";
import { titleize } from "../utils/stringUtils";
import "./CharacterEventStandings.css";

export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

export function timeLeft(endsAt, now = Date.now()) {
  const ms = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "ending now";
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "ends in under an hour";
  if (hours < 48) return `ends in ${hours}h`;
  return `ends in ${Math.floor(hours / 24)}d`;
}

/**
 * The character's placement in each WOM event running right now.
 * Renders nothing when they are in none, so it adds no clutter to the card.
 */
export default function CharacterEventStandings({ womId }) {
  const { events, loading, error } = usePlayerEvents(womId);

  // A WOM outage should not put an error on the profile; the rest of the
  // card is still useful without this.
  if (loading || error || events.length === 0) return null;

  return (
    <div className="character-events">
      <h4 className="character-events-header">Current Events</h4>
      <ul className="character-events-list">
        {events.map((event) => (
          <li key={event.competitionId} className="character-event">
            <div className="character-event-title">
              {event.rank === 1 && (
                <FaTrophy className="character-event-leader" aria-label="Leading" />
              )}
              <span>{event.title}</span>
            </div>
            <div className="character-event-detail">
              {event.rank ? (
                <strong className="character-event-rank">
                  {ordinal(event.rank)}
                  {event.participantCount ? ` of ${event.participantCount}` : ""}
                </strong>
              ) : (
                <strong className="character-event-rank">Unranked</strong>
              )}
              <span>
                {titleize(event.metric || "")} +
                {Number(event.gained || 0).toLocaleString()}
              </span>
              <span className="character-event-ends">{timeLeft(event.endsAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
