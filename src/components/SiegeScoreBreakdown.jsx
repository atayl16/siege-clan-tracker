import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { formatDate } from "../utils/dates";
import { ordinal } from "../utils/xpWeek";
import { titleById } from "../utils/weeklyTitles";
import { fetchLastReset } from "../hooks/useSiegeScoreReset";
import "./SiegeScoreBreakdown.css";
import { formatNumber } from "../utils/numbers";

const RECENT_SHOWN = 8;

/**
 * Where a character's Siege Score came from since scores were last reset:
 * competitions, weekly XP and weekly titles, from the award tables (all
 * public read). Whatever the awards do not account for (points staff add or
 * remove, edits) shows as "Other changes", plus or minus, so the lines always
 * add up to the score.
 *
 * Loads nothing until opened: the last reset, then three small queries for
 * this one character.
 *
 * @param {object} props
 * @param {number} props.womId
 * @param {number} props.total - members.siege_score
 */
export default function SiegeScoreBreakdown({ womId, total }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, error: null, awards: null, since: null });

  const load = async () => {
    setOpen(true);
    if (state.awards || state.loading) return;
    setState({ loading: true, error: null, awards: null, since: null });
    try {
      const since = await fetchLastReset();
      setState({ loading: false, error: null, awards: await fetchAwards(womId, since), since });
    } catch (err) {
      console.error("Could not load the Siege Score breakdown:", err);
      setState({ loading: false, error: err, awards: null, since: null });
    }
  };

  if (!open) {
    return (
      <button type="button" className="ssb-open" onClick={load}>
        Where did my Siege Score come from?
      </button>
    );
  }

  return (
    <section className="ssb" aria-labelledby={`ssb-${womId}`}>
      <div className="ssb-head">
        <h4 id={`ssb-${womId}`}>Siege Score Breakdown</h4>
        <button type="button" className="ssb-close" onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>
      {state.loading && <p className="ssb-note">Loading...</p>}
      {state.error && (
        <p className="ssb-note" role="alert">
          Could not load the breakdown. Try again later.
        </p>
      )}
      {state.awards && <Breakdown awards={state.awards} total={total} since={state.since} />}
    </section>
  );
}

const signed = (n) => `${n > 0 ? "+" : "\u2212"}${formatNumber(Math.abs(n))}`;

/** Totals by source, then the most recent awards. */
export function Breakdown({ awards, total, since = null }) {
  const sum = (kind) => awards.filter((a) => a.kind === kind).reduce((n, a) => n + a.points, 0);
  const count = (kind) => awards.filter((a) => a.kind === kind).length;
  const recorded = awards.reduce((n, a) => n + a.points, 0);
  // Can be negative: points removed, or an award overwritten by an edit.
  const other = (Number(total) || 0) - recorded;
  const sources = [
    ["Competitions", sum("event"), count("event")],
    ["Weekly XP (The Gainer)", sum("xp"), count("xp")],
    ["Weekly titles", sum("title"), count("title")],
  ].filter(([, points]) => points > 0);
  const recent = [...awards].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, RECENT_SHOWN);

  const sinceNote = since && <p className="ssb-note">Since scores were last reset on {formatDate(since)}.</p>;

  if (!sources.length && !other) {
    return (
      <>
        {sinceNote}
        <p className="ssb-note">No Siege Score yet. Take part in a competition or a weekly race to earn some.</p>
      </>
    );
  }

  return (
    <>
      {sinceNote}
      <ul className="ssb-sources">
        {sources.map(([label, points, n]) => (
          <li key={label}>
            <span>
              {label} <small>({n})</small>
            </span>
            <b>{formatNumber(points)}</b>
          </li>
        ))}
        {other !== 0 && (
          <li>
            <span title="Points added or removed by staff, or edited, with no award behind them">Other changes</span>
            <b>{signed(other)}</b>
          </li>
        )}
      </ul>
      {recent.length > 0 && (
        <>
          <div className="ssb-sub">Most recent</div>
          <ul className="ssb-recent">
            {recent.map((a) => (
              <li key={`${a.kind}-${a.id}`}>
                <span className="ssb-when">{a.date ? formatDate(a.date) : ""}</span>
                <span className="ssb-what">{a.label}</span>
                <b>+{a.points}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/**
 * The character's awards as { kind, id, date, label, points }, points > 0,
 * since `since` (the last reset) when given. A competition counts by when it
 * ended, a weekly award by its week's end: the points arrive then.
 * @param {number} womId
 * @param {string|null} [since] - ISO timestamp
 */
export async function fetchAwards(womId, since = null) {
  let events = supabase
    .from("event_results")
    .select(`id, placement, points_awarded, created_at, events${since ? "!inner" : ""}(name, end_date)`)
    .eq("wom_id", womId)
    .gt("points_awarded", 0);
  let xp = supabase.from("xp_awards").select("id, placement, points_awarded, week_end").eq("wom_id", womId).gt("points_awarded", 0);
  let titles = supabase
    .from("weekly_title_awards")
    .select("id, title, placement, points_awarded, week_end")
    .eq("wom_id", womId)
    .gt("points_awarded", 0);
  if (since) {
    events = events.gt("events.end_date", since);
    xp = xp.gt("week_end", since);
    titles = titles.gt("week_end", since);
  }
  [events, xp, titles] = await Promise.all([events, xp, titles]);
  for (const r of [events, xp, titles]) if (r.error) throw r.error;

  return [
    ...(events.data || []).map((r) => ({
      kind: "event",
      id: r.id,
      date: r.events?.end_date || r.created_at,
      label: `${r.placement ? `${ordinal(r.placement)} in ` : ""}${r.events?.name || "a competition"}`,
      points: r.points_awarded,
    })),
    ...(xp.data || []).map((r) => ({
      kind: "xp",
      id: r.id,
      date: r.week_end,
      label: `${ordinal(r.placement)} in weekly XP`,
      points: r.points_awarded,
    })),
    ...(titles.data || []).map((r) => ({
      kind: "title",
      id: r.id,
      date: r.week_end,
      label: `${ordinal(r.placement)} for ${titleById(r.title)?.name ?? r.title}`,
      points: r.points_awarded,
    })),
  ];
}
