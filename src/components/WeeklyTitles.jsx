import React from "react";
import {
  LuSword,
  LuPickaxe,
  LuBookOpen,
  LuScroll,
  LuSunrise,
  LuSkull,
  LuSailboat,
  LuShield,
  LuCrosshair,
  LuTrendingUp,
} from "react-icons/lu";
import PlaceBadge from "./PlaceBadge";
import { useTitleRaces, useTitleHolders } from "../hooks/useWeeklyTitles";
import { formatTitleValue, formatMinimum } from "../utils/weeklyTitles";
import { formatUkTime } from "../utils/xpWeek";
import "./WeeklyTitles.css";

const ICONS = {
  sword: LuSword,
  pickaxe: LuPickaxe,
  book: LuBookOpen,
  scroll: LuScroll,
  sunrise: LuSunrise,
  skull: LuSkull,
  sailboat: LuSailboat,
  shield: LuShield,
  crosshair: LuCrosshair,
  trend: LuTrendingUp,
};

export function TitleIcon({ icon, size = "md" }) {
  const Icon = ICONS[icon] || LuTrendingUp;
  return (
    <span className={`title-icon title-icon-${size}`} aria-hidden="true">
      <Icon />
    </span>
  );
}

/** The pill shown next to a title holder's name ("The Warrior"). */
export function TitleBadge({ name }) {
  return <span className="title-badge">{name}</span>;
}

/** Every title a member holds, as pills; nothing when they hold none. */
export function TitleBadges({ womId, byMember }) {
  const names = byMember?.get(Number(womId));
  if (!names?.length) return null;
  return (
    <span className="title-badges">
      {names.map((name) => (
        <TitleBadge key={name} name={name} />
      ))}
    </span>
  );
}

/** The tiles for who holds each title now (The Gainer first). */
export function TitleHolders() {
  const { holders, loading, error } = useTitleHolders();

  let body;
  if (loading) {
    body = <p className="titles-message">Loading title holders...</p>;
  } else if (error) {
    body = <p className="titles-message">Couldn't load the title holders. Try again in a few minutes.</p>;
  } else if (!holders.length) {
    body = <p className="titles-message">The first titles are awarded when this week ends.</p>;
  } else {
    body = (
      <ul className="title-holders">
        {holders.map(({ title, players }) => (
          <li key={title.id} className="title-holder">
            <TitleIcon icon={title.icon} size="lg" />
            <div className="title-holder-text">
              <span className="title-holder-title">{title.name}</span>
              <span className="title-holder-name" title={players.map((p) => p.name).join(", ")}>
                {players.map((p) => p.name).join(" & ")}
              </span>
              <span className="title-holder-value">{formatTitleValue(title, players[0].value)}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="titles-section" aria-labelledby="title-holders-h">
      <div className="titles-section-head">
        <h2 id="title-holders-h">Title holders</h2>
        <p>Last week's winners</p>
      </div>
      {body}
    </section>
  );
}

/** One title's race: only shown once somebody is over the minimum. */
function TitleRaceCard({ race }) {
  const { title, top, entrants } = race;

  return (
    <section className="title-race" aria-label={`${title.name} race`}>
      <div className="title-race-head">
        <TitleIcon icon={title.icon} />
        <div>
          <h3>{title.name}</h3>
          <p>
            {title.ranked} · minimum {formatMinimum(title)}
          </p>
        </div>
      </div>
      <ol className="title-race-list">
        {top.map((row) => (
          <li key={row.womId} className="title-race-row">
            <PlaceBadge place={row.place} size={28} />
            <span className="title-race-name" title={row.name}>
              {row.name}
            </span>
            <span className="title-race-value">{formatTitleValue(title, row.value)}</span>
            <span className="title-race-points">+{row.points}</span>
          </li>
        ))}
      </ol>
      <p className="title-race-foot">
        {entrants} member{entrants === 1 ? "" : "s"} in the race this week
      </p>
    </section>
  );
}

/**
 * This week's title races, top 3 each. A race nobody is over the minimum in
 * yet is left out rather than shown as an empty card.
 */
export function TitleRaces() {
  const { races, updatedAt, loading, error } = useTitleRaces();
  const running = races.filter((race) => race.top.length > 0);

  let body;
  if (loading) {
    body = <p className="titles-message">Loading this week's races...</p>;
  } else if (error) {
    body = <p className="titles-message">Couldn't load this week's races. Try again in a few minutes.</p>;
  } else if (!running.length) {
    body = <p className="titles-message">Nobody has reached a title's minimum yet this week.</p>;
  } else {
    body = (
      <div className="title-races">
        {running.map((race) => (
          <TitleRaceCard key={race.title.id} race={race} />
        ))}
      </div>
    );
  }

  return (
    <section className="titles-section" aria-labelledby="title-races-h">
      <div className="titles-section-head">
        <h2 id="title-races-h">This week's title races</h2>
        <p>
          Top 3 over the minimum earn 150 / 100 / 50 Siege Score, and 1st takes the title.
          {updatedAt && ` Last updated ${formatUkTime(updatedAt)} UK.`}
        </p>
      </div>
      {body}
    </section>
  );
}
