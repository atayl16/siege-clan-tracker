import React, { useMemo, useState } from "react";
import { usePlayer } from "../hooks/usePlayer";
import { buildAchievements, closestFirst, skillName } from "../utils/achievements";
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
 * @param {object} props
 * @param {Array<{ womId: number, name: string, isMain: boolean }>} props.characters
 *   the member's claimed characters, main first
 */
export default function ProfileAchievements({ characters }) {
  const [selected, setSelected] = useState(characters[0]?.womId ?? null);
  const [order, setOrder] = useState("closest");
  const { player, loading, error } = usePlayer(selected, { refreshInterval: 0, dedupingInterval: 600000 });
  const achievements = useMemo(() => buildAchievements(player), [player]);
  const current = characters.find((c) => c.womId === selected) ?? characters[0];

  return (
    <div className="ach">
      <div className="ach-bar">
        {characters.length > 1 && (
          <div className="ach-chips" role="group" aria-label="Character">
            {characters.map((c) => (
              <button
                key={c.womId}
                type="button"
                className={`ach-chip ${c.womId === selected ? "is-on" : ""}`}
                aria-pressed={c.womId === selected}
                onClick={() => setSelected(c.womId)}
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
        <div className="ach-order" role="group" aria-label="Order">
          {[
            ["closest", "Closest first"],
            ["game", "Skill order"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={order === id ? "is-on" : ""} aria-pressed={order === id} onClick={() => setOrder(id)}>
              {label}
            </button>
          ))}
        </div>
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
            {achievements.sections.map((section) =>
              section.rows.length ? (
                <section key={section.key} className="ach-card" aria-labelledby={`ach-${section.key}`}>
                  <h3 id={`ach-${section.key}`}>
                    {section.title}
                    {section.key === "bosses" && <small>bosses this character has killed</small>}
                  </h3>
                  {(order === "closest" ? closestFirst(section.rows) : section.rows).map((row) => (
                    <Row key={row.key} row={row} />
                  ))}
                </section>
              ) : null
            )}
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

function RowIcon({ row }) {
  if (row.kind === "skill") return <SkillIcon skill={row.name} />;
  if (row.kind === "boss") return <BossIcon boss={row.metric} />;
  if (row.kind === "clue") return <ActivityIcon type={row.metric} />;
  return <SkillIcon skill={row.metric === "combat" ? "Attack" : "Overall"} />;
}

function Row({ row }) {
  const done = row.next === -1;
  const summary = done
    ? `${row.name}: every milestone reached`
    : `${row.name}: ${row.reached} of ${row.points.length} milestones reached, next ${row.points[row.next].label}`;
  return (
    <div className="ach-row">
      <div className="ach-who">
        <span className="ach-icon" aria-hidden="true">
          <RowIcon row={row} />
        </span>
        <div>
          <div className="ach-name">{row.name}</div>
          <div className="ach-sub">{row.sub}</div>
        </div>
      </div>
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
