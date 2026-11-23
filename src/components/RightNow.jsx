import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { FaRegClock } from "react-icons/fa";
import { fetchJson } from "../utils/fetchJson";
import { useWeeklyXp } from "../hooks/useWeeklyXp";
import {
  competitionLabel,
  runningCompetitions,
  nextCompetitions,
  recentCompetitionCount,
  dayOf,
  localWhen,
} from "../utils/rightNow";
import "./RightNow.css";

const fmtXp = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/**
 * "Right Now" on the home page: this week's competitions, what's next, when
 * the week's titles and XP are awarded (in the visitor's own time), who's
 * leading weekly XP, and how many competitions ran in the last 30 days.
 *
 * Reuses data the site already serves edge-cached (WOM competitions and the
 * weekly XP race), loaded once with no background refresh. A tile with no
 * data is left out, and the whole strip is if none has any.
 */
export default function RightNow() {
  const { data: competitions } = useSWR("/api/wom-competitions", fetchJson, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 10 * 60 * 1000,
  });
  const { week, ranking } = useWeeklyXp({ poll: false });
  const now = Date.now();

  const running = runningCompetitions(competitions, now);
  const upcoming = nextCompetitions(competitions, now);
  const recent = recentCompetitionCount(competitions, now);
  const leader = ranking?.[0];

  const tiles = [];
  if (running.length) {
    tiles.push(
      <div className="rn-tile rn-wide" key="running">
        <div className="rn-label">
          <span className="rn-live" aria-hidden="true" /> This week · {dayOf(running[0], now)}
        </div>
        <ul className="rn-comps">
          {running.map((c) => {
            const { kind, name } = competitionLabel(c.title);
            return (
              <li key={c.id}>
                {kind && <span className="rn-kind">{kind}</span>}
                <span className="rn-name">{name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (upcoming.length) {
    tiles.push(
      <div className="rn-tile" key="next">
        <div className="rn-label">Next up · {localWhen(upcoming[0].startsAt, now)}</div>
        <div className="rn-value">{upcoming.map((c) => competitionLabel(c.title).name).join(", ")}</div>
      </div>
    );
  }
  if (week?.end) {
    tiles.push(
      <div className="rn-tile" key="reset">
        <div className="rn-label">Week ends</div>
        <div className="rn-value">{localWhen(week.end, now)}</div>
        <div className="rn-sub">
          Weekly titles and XP are awarded. <Link to="/leaderboard">See the races</Link>
        </div>
      </div>
    );
  }
  if (leader) {
    tiles.push(
      <div className="rn-tile" key="leader">
        <div className="rn-label">Leading weekly XP</div>
        <div className="rn-value">{leader.name}</div>
        <div className="rn-sub">{fmtXp(leader.gained)} XP gained this week</div>
      </div>
    );
  }
  if (recent > 0) {
    tiles.push(
      <div className="rn-tile" key="recent">
        <div className="rn-label">Last 30 days</div>
        <div className="rn-value">
          {recent} competition{recent === 1 ? "" : "s"}
        </div>
        <div className="rn-sub">
          <Link to="/events">See all events</Link>
        </div>
      </div>
    );
  }

  if (!tiles.length) return null;
  return (
    <section className="nm-section-container rn" aria-labelledby="right-now-h">
      <h3 className="nm-section-title" id="right-now-h">
        <FaRegClock className="nm-section-icon" /> Right Now
      </h3>
      <div className="rn-grid">{tiles}</div>
    </section>
  );
}
