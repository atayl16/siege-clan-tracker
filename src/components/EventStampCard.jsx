import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { xpWeekContaining } from "../utils/xpWeek";
import { formatDate } from "../utils/dates";
import "./EventStampCard.css";

const WEEKS = 12;

/**
 * The last WEEKS clan weeks, oldest first, as { start, end }. Stepped back
 * with xpWeekContaining rather than 7-day jumps, so UK clock changes do not
 * shift the boundaries by an hour.
 */
export function lastWeeks(now = new Date()) {
  const weeks = [xpWeekContaining(now)];
  while (weeks.length < WEEKS) weeks.unshift(xpWeekContaining(new Date(weeks[0].start.getTime() - 60 * 60 * 1000)));
  return weeks;
}

/**
 * The last WEEKS clan weeks (Monday 19:00 UK), oldest first, each with the
 * competitions any of the member's characters took part in that week.
 *
 * @param {Array<{ events: { name: string, start_date: string|null, end_date: string|null } }>} rows
 *   event_results rows (a row means the character gained something)
 * @param {Date} now
 */
export function stampWeeks(rows, now = new Date()) {
  const weeks = lastWeeks(now).map((w) => ({ ...w, events: [] }));
  for (const row of rows || []) {
    const e = row.events;
    if (!e) continue;
    // A week's competitions start at its Monday 19:00; the end lands exactly
    // on the next week's start, so place each by its start.
    const when = e.start_date ? new Date(e.start_date) : e.end_date ? new Date(new Date(e.end_date).getTime() - 1) : null;
    if (!when) continue;
    const week = weeks.find((w) => when >= w.start && when < w.end);
    if (week && !week.events.includes(e.name)) week.events.push(e.name);
  }
  return weeks;
}

async function fetchStamps(womIds, since) {
  const { data, error } = await supabase
    .from("event_results")
    .select("event_id, events!inner(name, start_date, end_date)")
    .in("wom_id", womIds)
    .gte("events.end_date", since);
  if (error) throw error;
  return data;
}

/**
 * Profile side card: a stamp for each of the last 12 weeks in which any of
 * the member's characters took part in a clan competition, like a coffee
 * shop loyalty card. One small query, once per visit.
 *
 * @param {object} props
 * @param {number[]} props.womIds - the member's characters
 */
export default function EventStampCard({ womIds }) {
  const ids = [...new Set((womIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
  const since = lastWeeks()[0].start.toISOString();
  const { data, error } = useSWR(ids.length ? ["event-stamps", ids.join(","), since] : null, () => fetchStamps(ids, since), {
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  const weeks = stampWeeks(data);
  const stamped = weeks.filter((w) => w.events.length).length;

  return (
    <section className="esc" aria-labelledby="esc-h">
      <div className="esc-head">
        <h3 id="esc-h">Event Card</h3>
        {data && (
          <span className="esc-count">
            {stamped}/{WEEKS} weeks
          </span>
        )}
      </div>
      {error ? (
        <p className="esc-note">Could not load your competitions.</p>
      ) : (
        <ol className="esc-stamps" aria-label={`Took part in a competition in ${stamped} of the last ${WEEKS} weeks`}>
          {weeks.map((w) => {
            const on = w.events.length > 0;
            const label = `Week of ${formatDate(w.start)}: ${on ? w.events.join(", ") : "no competitions"}`;
            return (
              <li key={w.start.toISOString()} className={`esc-stamp ${on ? "is-on" : ""}`} title={label}>
                <span className="esc-sr">{label}</span>
              </li>
            );
          })}
        </ol>
      )}
      {!error && (
        <p className="esc-note">
          {!data
            ? "One stamp for each week you take part in a clan competition."
            : stamped === 0
              ? "Take part in a Skill, Boss or Raid of the Week to stamp your first week."
              : "One stamp for each week you took part in a clan competition."}{" "}
          <Link to="/events">See events</Link>
        </p>
      )}
    </section>
  );
}
