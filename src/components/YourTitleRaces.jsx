import React from "react";
import { Link } from "react-router-dom";
import { useTitleRaces } from "../hooks/useWeeklyTitles";
import { formatTitleValue } from "../utils/weeklyTitles";
import { titleStanding, standingOrder } from "../utils/titleStanding";
import { ordinal } from "../utils/xpWeek";
import { TitleIcon } from "./WeeklyTitles";
import "./YourTitleRaces.css";

const SHOWN = 4;

/**
 * Profile side card: titles the member's characters hold now, and where they
 * stand in this week's title races. Useful to everyone, not only the few in
 * the top 3: the standings hold every member with progress, so it can say
 * "12th of 54, 3.2 EHP behind 3rd" or "40K XP more to enter". Shows the
 * best few; the Leaderboard has the rest. Live standings come from
 * useTitleRaces, shared with the Leaderboard and cached for 10 minutes.
 *
 * @param {object} props
 * @param {Array<{ womId: number, name: string }>} props.characters
 * @param {Array<object>} props.held - titles held now (from useTitleHolders)
 */
export default function YourTitleRaces({ characters, held = [] }) {
  const { races, loading } = useTitleRaces();
  const several = characters.length > 1;

  const standings = races
    .flatMap(({ title, rows = [] }) =>
      characters.map((c) => {
        const s = titleStanding(title, rows, c.womId);
        return s && { ...s, title, name: c.name, womId: c.womId };
      })
    )
    .filter(Boolean)
    .sort((a, b) => standingOrder(a) - standingOrder(b));

  // One line per race: the member's best character in it.
  const seen = new Set();
  const best = standings.filter((s) => !seen.has(s.title.id) && seen.add(s.title.id));
  const shown = best.slice(0, SHOWN);

  return (
    <section className="ytr" aria-labelledby="ytr-h">
      <h3 id="ytr-h">Your Title Races</h3>

      {held.length > 0 && (
        <>
          <div className="ytr-sub">Holding now</div>
          <ul className="ytr-list">
            {held.map((title) => (
              <li key={title.id}>
                <TitleIcon icon={title.icon} size="sm" />
                <span className="ytr-name">{title.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="ytr-sub">This week</div>
      {loading ? (
        <p className="ytr-note">Loading...</p>
      ) : shown.length ? (
        <ul className="ytr-list">
          {shown.map((s) => (
            <li key={s.title.id}>
              <TitleIcon icon={s.title.icon} size="sm" />
              <span className="ytr-name">
                {s.title.name}
                {several && <small>{s.name}</small>}
                <span className="ytr-detail">{detail(s)}</span>
              </span>
              {s.kind === "placing" && (
                <>
                  <span className="ytr-place">{ordinal(s.place)}</span>
                  <b>+{s.points}</b>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ytr-note">
          No progress in a title race yet this week. Gain XP, kill bosses, do clues or raids to enter.
        </p>
      )}
      <Link className="ytr-link" to="/leaderboard">
        {best.length > SHOWN ? `See all ${best.length} of your races` : "See every race"}
      </Link>
    </section>
  );
}

function detail(s) {
  if (s.kind === "placing") return `of ${s.of}`;
  if (s.kind === "chasing") return `${ordinal(s.place)} of ${s.of} · ${formatTitleValue(s.title, s.behind)} behind 3rd`;
  return `${formatTitleValue(s.title, s.short)} more to enter`;
}
