import React, { useMemo, useState } from "react";
import { usePlayer } from "../hooks/usePlayer";
import { buildAchievements, orderRows, skillName } from "../utils/achievements";
import { SkillIcon, BossIcon, ActivityIcon } from "./OsrsIcons";
import "./ProfileAchievements.css";

/**
 * The profile's Achievements tab: milestone tracks for one character at a
 * time, worked out from their Wise Old Man stats (utils/achievements.js).
 *
 * Usage-conscious by design. Profile tabs mount only while open, so this
 * fetches nothing until someone opens it. It loads one character at a time,
 * from the edge-cached /api/wom-player, once: no background refresh. A
 * character viewed earlier in the visit comes back from SWR's cache.
 *
 * Overall is always shown first; below it, one section at a time (Skills,
 * Bosses or Activities), each in the chosen order. Long boss lists show the
 * first BOSSES_SHOWN until asked for the rest.
 *
 * @param {object} props
 * @param {Array<{ womId: number, name: string, isMain: boolean }>} props.characters
 *   the member's claimed characters, main first
 */
const BOSSES_SHOWN = 10;

const ORDERS = [
  ["closest", "Closest first"],
  ["game", "Game order"],
  ["alpha", "A to Z"],
];

export default function ProfileAchievements({ characters }) {
  const [selected, setSelected] = useState(characters[0]?.womId ?? null);
  const [order, setOrder] = useState("closest");
  const [sectionKey, setSectionKey] = useState("skills");
  const [allBosses, setAllBosses] = useState(false);
  // The character shown, worked out first: if the one picked is no longer
  // claimed (the claims list refreshed while the tab was open), fall back to
  // the main, and load and highlight that one.
  const current = characters.find((c) => c.womId === selected) ?? characters[0];
  const activeId = current?.womId ?? null;
  const { player, loading, error } = usePlayer(activeId, { refreshInterval: 0, dedupingInterval: 600000 });
  const achievements = useMemo(() => buildAchievements(player), [player]);

  return (
    <div className="ach">
      <div className="ach-bar">
        {characters.length > 1 && (
          <div className="ach-chips" role="group" aria-label="Character">
            {characters.map((c) => (
              <button
                key={c.womId}
                type="button"
                className={`ach-chip ${c.womId === activeId ? "is-on" : ""}`}
                aria-pressed={c.womId === activeId}
                onClick={() => {
                  setSelected(c.womId);
                  setAllBosses(false);
                }}
              >
                {c.name}
                {c.isMain && <span className="ach-main">Main</span>}
              </button>
            ))}
          </div>
        )}
        {achievements && (
          <p className="ach-summary">
            <b>{achievements.reached}</b> of {achievements.total} milestones reached.
            {achievements.nearest && (
              <>
                {" "}Nearest: <strong>{achievements.nearest.nextLabel}</strong> (
                {Math.floor(achievements.nearest.closeness * 100)}%)
              </>
            )}
          </p>
        )}
      </div>

      {loading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading {current?.name}'s stats...</div>
        </div>
      )}
      {!loading && (error || !achievements) && (
        <p className="ach-error" role="alert">
          Could not load {current?.name}'s stats from Wise Old Man. Try again in a few minutes.
        </p>
      )}

      {achievements && !loading && (
        <div className="ach-cols">
          <div className="ach-main-col">
            <Section section={achievements.sections.find((x) => x.key === "overall")} rows={null} />
            <SectionPicker
              sections={achievements.sections.filter((x) => x.key !== "overall" && x.rows.length)}
              active={sectionKey}
              onPick={setSectionKey}
              order={order}
              onOrder={setOrder}
              allBosses={allBosses}
              onAllBosses={() => setAllBosses(true)}
            />
          </div>

          <aside className="ach-side">
            <section className="ach-card ach-stats" aria-labelledby="ach-stats-h">
              <h3 id="ach-stats-h">{current?.name}</h3>
              <Stat label="Total level" value={achievements.stats.totalLevel} />
              <Stat label="Combat" value={achievements.stats.combat} />
              <Stat label="EHB" value={achievements.stats.ehb} />
              <Stat label="EHP" value={achievements.stats.ehp} />
              {achievements.updatedAt && <p className="ach-note">Stats from Wise Old Man, updated {ago(achievements.updatedAt)}.</p>}
            </section>

            <section className="ach-card" aria-labelledby="ach-capes-h">
              <h3 id="ach-capes-h">
                Skillcapes <small>{achievements.capes.earned.length} at 99</small>
              </h3>
              {achievements.capes.earned.length > 0 && (
                <>
                  <div className="ach-sec">Earned</div>
                  <ul className="ach-capes">
                    {achievements.capes.earned.map((m) => (
                      <li key={m} className="ach-cape is-earned" title={`99 ${skillName(m)}`}>
                        <SkillIcon skill={skillName(m)} />
                        <span>99</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {achievements.capes.closest.length > 0 && (
                <>
                  <div className="ach-sec">Closest to 99</div>
                  <ul className="ach-capes">
                    {achievements.capes.closest.map(({ metric, progress }) => (
                      <li key={metric} className="ach-cape" title={`${skillName(metric)}: ${Math.floor(progress * 100)}% of the XP for 99`}>
                        <SkillIcon skill={skillName(metric)} />
                        <span>99</span>
                        <em>{Math.floor(progress * 100)}%</em>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

/** A titled card of rows. rows defaults to the section's own order. */
function Section({ section, rows, extra = null }) {
  const id = `ach-${section.key}`;
  return (
    <section className="ach-card" aria-labelledby={id}>
      <h3 id={id}>
        {section.title}
        {section.key === "bosses" && <small>bosses this character has killed</small>}
        {section.key === "activities" && <small>only what this character has done</small>}
      </h3>
      {(rows ?? section.rows).map((row) => (
        <Row key={row.key} row={row} />
      ))}
      {extra}
    </section>
  );
}

/**
 * Buttons for Skills, Bosses and Activities, each with its milestone count,
 * and the order buttons; then the chosen section. Sections with nothing in
 * them (no boss kills yet) get no button.
 */
function SectionPicker({ sections, active, onPick, order, onOrder, allBosses, onAllBosses }) {
  if (!sections.length) return null;
  const section = sections.find((x) => x.key === active) ?? sections[0];
  const ordered = orderRows(section.rows, order);
  const cut = section.key === "bosses" && !allBosses && ordered.length > BOSSES_SHOWN;
  const rows = cut ? ordered.slice(0, BOSSES_SHOWN) : ordered;
  const count = (x) => {
    const total = x.rows.reduce((n, r) => n + r.points.length, 0);
    const reached = x.rows.reduce((n, r) => n + r.reached, 0);
    return `${reached}/${total}`;
  };

  return (
    <>
      <div className="ach-pick">
        <div className="ach-sections" role="group" aria-label="Section">
          {sections.map((x) => (
            <button
              key={x.key}
              type="button"
              className={x.key === section.key ? "is-on" : ""}
              aria-pressed={x.key === section.key}
              onClick={() => onPick(x.key)}
            >
              {x.title} <span className="ach-count">{count(x)}</span>
            </button>
          ))}
        </div>
        <div className="ach-order" role="group" aria-label="Order">
          {ORDERS.map(([id, label]) => (
            <button key={id} type="button" className={order === id ? "is-on" : ""} aria-pressed={order === id} onClick={() => onOrder(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Section
        section={section}
        rows={rows}
        extra={
          cut && (
            <button type="button" className="ach-more" onClick={onAllBosses}>
              Show all {ordered.length} bosses
            </button>
          )
        }
      />
    </>
  );
}

function RowIcon({ row }) {
  if (row.kind === "skill") return <SkillIcon skill={row.name} />;
  if (row.kind === "boss") return <BossIcon boss={row.metric} />;
  if (row.kind === "clue" || row.kind === "activity" || row.kind === "rating") return <ActivityIcon type={row.metric} />;
  return <SkillIcon skill={row.metric === "combat" ? "Attack" : "Overall"} />;
}

function Row({ row }) {
  if (row.kind === "rating") {
    return (
      <div className="ach-row">
        <RowName row={row} />
        <div className="ach-rating">
          <b>{Number(row.value).toLocaleString("en-GB")}</b> rating
        </div>
      </div>
    );
  }
  const done = row.next === -1;
  const summary = done
    ? `${row.name}: every milestone reached`
    : `${row.name}: ${row.reached} of ${row.points.length} milestones reached, next ${row.points[row.next].label}`;
  return (
    <div className="ach-row">
      <RowName row={row} />
      <div className="ach-track" role="img" aria-label={summary}>
        <div className="ach-rail" />
        <div className="ach-fill" style={{ width: `${row.fill}%` }} />
        {row.points.map((p, i) => {
          const state = p.reached ? "done" : i === row.next ? "next" : "todo";
          const left = `${row.points.length > 1 ? (i / (row.points.length - 1)) * 100 : 0}%`;
          return (
            <React.Fragment key={p.label}>
              <span className={`ach-dot is-${state}`} style={{ left }} />
              <span className={`ach-lbl is-${state}`} style={{ left }}>
                {p.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function RowName({ row }) {
  return (
    <div className="ach-who">
      <span className="ach-icon" aria-hidden="true">
        <RowIcon row={row} />
      </span>
      <div>
        <div className="ach-name">{row.name}</div>
        <div className="ach-sub">{row.sub}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="ach-stat">
      <span>{label}</span>
      <b>{Number(value).toLocaleString("en-GB")}</b>
    </div>
  );
}

/** "17 minutes ago", "3 hours ago", "2 days ago". */
export function ago(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
