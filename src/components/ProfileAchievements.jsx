import React, { useMemo, useState } from "react";
import { usePlayer } from "../hooks/usePlayer";
import { buildAchievements, orderRows, skillName } from "../utils/achievements";
import { SkillIcon, BossIcon, ActivityIcon } from "./OsrsIcons";
import { timeAgo } from "../utils/dates";
import { useCharacterActivity } from "../hooks/useRuneProfile";
import { RUNEPROFILE_URL, RUNEPROFILE_GUIDE_URL } from "../utils/runeProfile";
import ActivityList from "./ActivityList";
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
  ["closest", "Closest First"],
  ["game", "Game Order"],
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
        <div className="ach-main-col">
          {/* Overall carries the skillcapes and when WOM last updated; one
              column, so the tracks get the full width. */}
          <Section
            section={achievements.sections.find((x) => x.key === "overall")}
            note={achievements.updatedAt ? `Updated ${ago(achievements.updatedAt)}` : null}
            extra={<Skillcapes capes={achievements.capes} />}
          />
          <SectionPicker
            sections={achievements.sections.filter((x) => x.key !== "overall" && x.rows.length)}
            active={sectionKey}
            onPick={setSectionKey}
            order={order}
            onOrder={setOrder}
            allBosses={allBosses}
            onAllBosses={() => setAllBosses(true)}
            characterName={current?.name}
          />
        </div>
      )}
    </div>
  );
}

/** A titled card of rows. rows defaults to the section's own order. */
function Section({ section, rows, extra = null, note = null }) {
  const id = `ach-${section.key}`;
  return (
    <section className="ach-card" aria-labelledby={id}>
      <div className="ach-card-head">
        <h3 id={id}>{section.title}</h3>
        {note && <span className="ach-note">{note}</span>}
      </div>
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
function SectionPicker({ sections, active, onPick, order, onOrder, allBosses, onAllBosses, characterName }) {
  // "Recent" (RuneProfile activity) sits with the milestone sections but has
  // no milestones and no order; it loads only while it is the one open.
  const recentOpen = active === "recent";
  const section = recentOpen ? null : sections.find((x) => x.key === active) ?? sections[0];
  if (!section && !recentOpen) return null;
  const ordered = section ? orderRows(section.rows, order) : [];
  const cut = section?.key === "bosses" && !allBosses && ordered.length > BOSSES_SHOWN;
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
              className={x.key === section?.key ? "is-on" : ""}
              aria-pressed={x.key === section?.key}
              onClick={() => onPick(x.key)}
            >
              {x.title} <span className="ach-count">{count(x)}</span>
            </button>
          ))}
          <button type="button" className={recentOpen ? "is-on" : ""} aria-pressed={recentOpen} onClick={() => onPick("recent")}>
            Recent
          </button>
        </div>
        {!recentOpen && (
          <div className="ach-order" role="group" aria-label="Order">
            {ORDERS.map(([id, label]) => (
              <button key={id} type="button" className={order === id ? "is-on" : ""} aria-pressed={order === id} onClick={() => onOrder(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {recentOpen ? (
        <RecentActivity name={characterName} />
      ) : (
        <Section
          section={section}
          rows={rows}
          extra={
            cut && (
              <button type="button" className="ach-more" onClick={onAllBosses}>
                Show All {ordered.length} Bosses
              </button>
            )
          }
        />
      )}
    </>
  );
}

/**
 * The character's latest RuneProfile activity: new collection log items,
 * drops, quests, diaries, combat achievements and level-ups. Mounted only
 * while "Recent" is open, so it is fetched only then (edge-cached).
 */
function RecentActivity({ name }) {
  const { activities, found, loading, error } = useCharacterActivity(name);
  return (
    <section className="ach-card" aria-labelledby="ach-recent">
      <div className="ach-card-head">
        <h3 id="ach-recent">Recent</h3>
        <span className="ach-note">
          From{" "}
          <a href={`${RUNEPROFILE_URL}/${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer">
            RuneProfile
          </a>
        </span>
      </div>
      {loading && <p className="ach-recent-note">Loading...</p>}
      {!loading && error && (
        <p className="ach-recent-note" role="alert">
          Could not load recent activity from RuneProfile. Try again later.
        </p>
      )}
      {!loading && !error && found === false && (
        <p className="ach-recent-note">
          {name} is not on RuneProfile yet. Install the RuneProfile plugin in RuneLite to show recent drops,
          quests and level-ups here.{" "}
          <a href={RUNEPROFILE_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            How to set it up
          </a>
        </p>
      )}
      {!loading && !error && found && !activities.length && <p className="ach-recent-note">No recent activity.</p>}
      {!loading && !error && found && activities.length > 0 && <ActivityList activities={activities} />}
    </section>
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

/** Skillcapes earned, and the three skills closest to 99, under Overall. */
function Skillcapes({ capes }) {
  if (!capes.earned.length && !capes.closest.length) return null;
  return (
    <div className="ach-capes-row">
      {capes.earned.length > 0 && (
        <div className="ach-capes-group">
          <div className="ach-sec">Skillcapes ({capes.earned.length})</div>
          <ul className="ach-capes">
            {capes.earned.map((m) => (
              <li key={m} className="ach-cape is-earned" title={`99 ${skillName(m)}`}>
                <SkillIcon skill={skillName(m)} />
                <span>99</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {capes.closest.length > 0 && (
        <div className="ach-capes-group">
          <div className="ach-sec">Closest to 99</div>
          <ul className="ach-capes">
            {capes.closest.map(({ metric, progress }) => (
              <li key={metric} className="ach-cape" title={`${skillName(metric)}: ${Math.floor(progress * 100)}% of the XP for 99`}>
                <SkillIcon skill={skillName(metric)} />
                <span>99</span>
                <em>{Math.floor(progress * 100)}%</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Kept under its old name for existing callers. */
export const ago = timeAgo;
