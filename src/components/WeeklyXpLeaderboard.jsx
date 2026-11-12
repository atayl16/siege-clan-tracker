import React, { useState } from "react";
import Button from "./ui/Button";
import { FaCrown, FaMedal, FaChartLine } from "react-icons/fa";
import { useWeeklyXp } from "../hooks/useWeeklyXp";
import { formatXp, formatUkTime, ordinal, weeklyTargets, XP_AWARD_PLACES } from "../utils/xpWeek";
import "./Leaderboard.css";
import "./WeeklyXpLeaderboard.css";

function PlaceBadge({ place }) {
  return (
    <span className={`ui-rank-badge ui-rank-${place}`} aria-label={`Place ${place}`}>
      {place === 1 ? (
        <FaCrown className="ui-gold-icon" />
      ) : place === 2 ? (
        <FaMedal className="ui-silver-icon" />
      ) : place === 3 ? (
        <FaMedal className="ui-bronze-icon" />
      ) : (
        place
      )}
    </span>
  );
}

function StandingsList({ rows, highlightIds, pointsLabel }) {
  return (
    <ol className="xp-week-list">
      {rows.map((row, i) => {
        const isYours = highlightIds.has(Number(row.womId));
        // In the full list, a line under the last paid place.
        const firstUnpaid = row.points === 0 && i > 0 && rows[i - 1].points > 0;
        return (
          <li
            key={row.womId}
            className={`ui-mini-player xp-week-row${isYours ? " xp-week-row-yours" : ""}${
              firstUnpaid ? " xp-week-row-cutoff" : ""
            }`}
          >
            <PlaceBadge place={row.place} />
            <span className="ui-player-name" title={row.name}>
              {row.name}
              {isYours && <span className="xp-week-you">You</span>}
            </span>
            <span className="xp-week-gained">{formatXp(row.gained)} XP</span>
            {row.points > 0 ? (
              <span className="xp-week-points" title={`${row.points} Siege Score ${pointsLabel}`}>
                +{row.points}
              </span>
            ) : (
              <span className="xp-week-points" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** What to aim for, e.g. "1.78M XP to reach 5th (+2 Siege Score) · 14K to catch 25th". */
function targetText(mine, next, topFive, lead) {
  if (topFive) {
    const aim = topFive.open
      ? `Gain any XP to place ${ordinal(topFive.place)}`
      : `${formatXp(topFive.gap)} XP to reach ${ordinal(topFive.place)}`;
    const reward = topFive.points > 0 ? ` (+${topFive.points} Siege Score)` : "";
    const catchNext =
      mine && next && next.place !== topFive.place
        ? ` · ${formatXp(next.gap)} to catch ${ordinal(next.place)}`
        : "";
    return `${aim}${reward}${catchNext}`;
  }
  const now = `+${mine.points} Siege Score if it ends now`;
  if (mine.place === 1) return lead ? `${now} · ${formatXp(lead)} XP ahead of 2nd` : now;
  return next ? `${now} · ${formatXp(next.gap)} XP to catch ${ordinal(next.place)} (+${next.points})` : now;
}

/**
 * One line for the Profile header: where the viewer's main character stands
 * in this week's XP ranking, e.g. "26th of 52 this week · 310K XP" (52
 * members have gained XP so far), and what it would take to move up.
 *
 * `character` is { womId, name }, or null when nothing is claimed.
 */
export function YourWeeklyXp({ character }) {
  const { ranking, loading, error } = useWeeklyXp();

  let content;
  if (!character) {
    content = <span className="your-xp-muted">Claim a character to track your weekly XP</span>;
  } else if (loading) {
    content = <span className="your-xp-muted">Loading your weekly XP...</span>;
  } else if (error) {
    content = <span className="your-xp-muted">Weekly XP is unavailable right now</span>;
  } else {
    const { mine, next, topFive, lead } = weeklyTargets(ranking, character.womId);
    content = (
      <>
        {mine ? (
          <>
            <span className="your-xp-place">
              {ordinal(mine.place)} of {ranking.length}
            </span>{" "}
            <span className="your-xp-main">this week · {formatXp(mine.gained)} XP</span>{" "}
            {/* Accounts can claim several characters; say which one this is. */}
            <span className="your-xp-muted">Tracking {character.name}</span>
          </>
        ) : (
          <span className="your-xp-muted">{character.name} has no XP gained yet this week</span>
        )}{" "}
        <span className="your-xp-target">{targetText(mine, next, topFive, lead)}</span>
      </>
    );
  }

  return (
    <div className="your-xp" data-testid="your-weekly-xp">
      <FaChartLine className="your-xp-icon" aria-hidden="true" />
      {content}
    </div>
  );
}

/**
 * The weekly Overall XP leaderboard: the top five XP gainers this week, who
 * earn Siege Score when the week closes (Monday 19:00 UK, with SotW/BotW).
 *
 *   variant="compact"  this week only, for the Profile header
 *   variant="full"     this week and last week's paid winners, for Leaderboards,
 *                      with a toggle to list everyone who has gained XP
 *
 * highlightIds marks the viewer's own characters.
 */
export default function WeeklyXpLeaderboard({
  variant = "compact",
  highlightIds = [],
  className = "",
}) {
  const { week, ranking, standings, loading, error, lastWeek, lastWeekError } = useWeeklyXp();
  const highlight = new Set(highlightIds.map(Number));
  const full = variant === "full";
  const [showAll, setShowAll] = useState(false);
  const canShowAll = full && ranking.length > standings.length;

  let body;
  if (loading) {
    body = <div className="xp-week-message">Loading this week's XP...</div>;
  } else if (error) {
    body = (
      <div className="xp-week-message">
        Couldn't load this week's XP from Wise Old Man.
      </div>
    );
  } else if (standings.length === 0) {
    body = <div className="xp-week-message">No XP gained yet this week.</div>;
  } else {
    body = (
      <>
        <StandingsList
          rows={showAll && canShowAll ? ranking : standings}
          highlightIds={highlight}
          pointsLabel="if it ends now"
        />
        {canShowAll && (
          <div className="xp-week-toggle">
            <Button variant="secondary" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show top 5" : `Show all ${ranking.length} gaining XP`}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className={`xp-week xp-week-${variant} ${className}`.trim()}>
      <div className="xp-week-columns">
        <div className="xp-week-column">
          <h3 className="xp-week-title">
            <FaChartLine className="xp-week-icon" aria-hidden="true" />
            {full ? "This week" : "Top XP this week"}
          </h3>
          {body}
          <p className="xp-week-note">
            Top {XP_AWARD_PLACES} earn Siege Score · ends {formatUkTime(week.end)} UK
          </p>
        </div>

        {full && (
          <div className="xp-week-column">
            <h3 className="xp-week-title">
              <FaCrown className="xp-week-icon" aria-hidden="true" />
              Last week's winners
            </h3>
            {lastWeek?.winners?.length ? (
              <>
                <StandingsList
                  rows={lastWeek.winners}
                  highlightIds={highlight}
                  pointsLabel="awarded"
                />
                <p className="xp-week-note">
                  {formatUkTime(lastWeek.start)} to {formatUkTime(lastWeek.end)} UK
                </p>
              </>
            ) : lastWeekError ? (
              <div className="xp-week-message">
                Couldn't load last week's winners.
              </div>
            ) : (
              <div className="xp-week-message">
                The first winners are paid when this week ends.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
