import React, { useState } from "react";
import Button from "./ui/Button";
import { FaChartLine } from "react-icons/fa";
import PlaceBadge from "./PlaceBadge";
import { TitleIcon } from "./WeeklyTitles";
import { useWeeklyXp } from "../hooks/useWeeklyXp";
import { formatXp, formatUkTime, ordinal, weeklyTargets, XP_AWARD_PLACES } from "../utils/xpWeek";
import { GAINER } from "../utils/weeklyTitles";
import "./Leaderboard.css";
import "./WeeklyXpLeaderboard.css";

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
            <PlaceBadge place={row.place} size={26} />
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

/** What to aim for, e.g. "1.78M XP to reach 5th (+20 Siege Score) · 14K to catch 25th". */
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
 * The weekly Overall XP race, The Gainer: the top five XP gainers this week
 * earn Siege Score when the week closes (Monday 19:00 UK, with SotW/BotW).
 *
 *   variant="compact"  a list of the top five, for the Profile header
 *   variant="full"     the Leaderboard's strip: the top five as tiles, and a
 *                      toggle listing everyone else who has gained XP
 *
 * highlightIds marks the viewer's own characters. Last week's winner shows
 * with the other title holders (TitleHolders), not here.
 */
export default function WeeklyXpLeaderboard({
  variant = "compact",
  highlightIds = [],
  className = "",
}) {
  const full = variant === "full";
  const { week, ranking, standings, loading, error } = useWeeklyXp();
  const highlight = new Set(highlightIds.map(Number));
  const [showAll, setShowAll] = useState(false);
  const rest = ranking.filter((r) => r.points === 0);

  let body;
  if (loading) {
    body = <div className="xp-week-message">Loading this week's XP...</div>;
  } else if (error) {
    body = (
      <div className="xp-week-message">
        Couldn't load this week's XP standings. Try again in a few minutes.
      </div>
    );
  } else if (standings.length === 0) {
    body = <div className="xp-week-message">No XP gained yet this week.</div>;
  } else if (!full) {
    body = <StandingsList rows={standings} highlightIds={highlight} pointsLabel="if it ends now" />;
  } else {
    body = (
      <>
        <ol className="xp-strip-tiles">
          {standings.map((row) => (
            <li
              key={row.womId}
              className={`xp-strip-tile${highlight.has(Number(row.womId)) ? " xp-week-row-yours" : ""}`}
            >
              <div className="xp-strip-tile-top">
                <PlaceBadge place={row.place} size={30} />
                <span className="xp-week-points" title={`${row.points} Siege Score if it ends now`}>
                  +{row.points}
                </span>
              </div>
              <span className="xp-strip-tile-name" title={row.name}>
                {row.name}
              </span>
              <span className="xp-week-gained">{formatXp(row.gained)} XP</span>
            </li>
          ))}
        </ol>
        {showAll && rest.length > 0 && (
          <StandingsList rows={rest} highlightIds={highlight} pointsLabel="if it ends now" />
        )}
      </>
    );
  }

  if (full) {
    return (
      <section className={`xp-week xp-week-full xp-strip ${className}`.trim()} aria-labelledby="gainer-h">
        <div className="xp-strip-head">
          <div className="xp-strip-heading">
            <TitleIcon icon={GAINER.icon} />
            <div>
              <h3 id="gainer-h">{GAINER.name}</h3>
              <p>{GAINER.ranked}</p>
            </div>
          </div>
          {rest.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show top 5" : `Show all ${ranking.length} gaining XP`}
            </Button>
          )}
        </div>
        {body}
      </section>
    );
  }

  return (
    <section className={`xp-week xp-week-${variant} ${className}`.trim()}>
      <h3 className="xp-week-title">
        <FaChartLine className="xp-week-icon" aria-hidden="true" />
        Top XP this week
      </h3>
      {body}
      <p className="xp-week-note">
        Top {XP_AWARD_PLACES} earn Siege Score · ends {formatUkTime(week.end)} UK
      </p>
    </section>
  );
}
