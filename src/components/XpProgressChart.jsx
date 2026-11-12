import React, { useMemo, useState, useId } from "react";
import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";
import { formatXp } from "../utils/xpWeek";
import "./XpProgressChart.css";

const PERIODS = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

// SVG user units. Rendered at 100% width; the line keeps its 2px through
// vector-effect, so the stretch only affects geometry.
const W = 300;
const H = 80;
const PAD_Y = 6;

const dateLabel = (iso, period) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(period === "year" ? { year: "2-digit" } : {}),
  });

const fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Plot coordinates for each point: x by time, y scaled to the period's range. */
export function layoutPoints(points) {
  if (!points?.length) return [];
  const t0 = Date.parse(points[0].date);
  const t1 = Date.parse(points[points.length - 1].date);
  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const spanT = t1 - t0 || 1;
  const spanV = hi - lo;
  return points.map((p) => ({
    ...p,
    x: ((Date.parse(p.date) - t0) / spanT) * W,
    // A flat period (no XP gained) sits along the bottom.
    y: spanV ? H - PAD_Y - ((p.value - lo) / spanV) * (H - 2 * PAD_Y) : H - PAD_Y,
  }));
}

/**
 * A small chart of one character's total XP over the last week, month or
 * year, from their WOM snapshots (/api/wom-player-timeline, cached for ten
 * minutes). Hover or arrow keys show the XP at each snapshot.
 */
export default function XpProgressChart({ womId }) {
  const [period, setPeriod] = useState("month");
  const [active, setActive] = useState(null);
  const titleId = useId();

  const { data, error } = useSWR(
    womId ? `/api/wom-player-timeline?id=${encodeURIComponent(womId)}&period=${period}` : null,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  );

  const plotted = useMemo(() => layoutPoints(data?.points), [data]);
  const loading = !data && !error;
  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const gained = first && last ? last.value - first.value : 0;
  // WOM's periods are rolling: the last 7 days, 30 days or 12 months.
  const periodWord = {
    week: "in the past week",
    month: "in the past month",
    year: "in the past year",
  }[period];

  const linePath = plotted.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const areaPath = plotted.length ? `${linePath}L${W},${H}L0,${H}Z` : "";
  const hovered = active != null ? plotted[active] : null;

  const nearestIndex = (clientX, rect) => {
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < plotted.length; i++) {
      if (Math.abs(plotted[i].x - x) < Math.abs(plotted[best].x - x)) best = i;
    }
    return best;
  };

  const onKeyDown = (e) => {
    if (!plotted.length) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      const from = active ?? (step > 0 ? -1 : plotted.length);
      setActive(Math.min(plotted.length - 1, Math.max(0, from + step)));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  let body;
  if (loading) {
    body = <div className="xp-chart-message">Loading XP history...</div>;
  } else if (error) {
    body = <div className="xp-chart-message">Couldn't load XP history from Wise Old Man.</div>;
  } else if (plotted.length < 2) {
    body = <div className="xp-chart-message">Not enough Wise Old Man data for this period yet.</div>;
  } else {
    body = (
      <>
        <div className="xp-chart-headline">
          <span className="xp-chart-gain">+{formatXp(gained)} XP</span>{" "}
          <span className="xp-chart-muted">
            {periodWord} · {formatXp(last.value)} total
          </span>
        </div>
        <div className="xp-chart-plot">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="xp-chart-svg"
            role="img"
            tabIndex={0}
            aria-labelledby={titleId}
            onPointerMove={(e) => setActive(nearestIndex(e.clientX, e.currentTarget.getBoundingClientRect()))}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
          >
            <title id={titleId}>
              {`Total XP ${periodWord}: from ${formatXp(first.value)} on ${dateLabel(first.date, period)} ` +
                `to ${formatXp(last.value)} on ${dateLabel(last.date, period)}, ` +
                `a gain of ${formatXp(gained)}. Use the arrow keys to read each snapshot.`}
            </title>
            <path d={areaPath} className="xp-chart-area" />
            <path d={linePath} className="xp-chart-line" vectorEffect="non-scaling-stroke" />
            {hovered && (
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={0}
                y2={H}
                className="xp-chart-crosshair"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {hovered && (
            <>
              {/* HTML, not SVG, so the dot stays round when the SVG stretches. */}
              <span
                className="xp-chart-dot"
                style={{ left: `${(hovered.x / W) * 100}%`, top: `${(hovered.y / H) * 100}%` }}
              />
              <div
                className={`xp-chart-tooltip${hovered.x > W / 2 ? " xp-chart-tooltip-left" : ""}`}
                style={{ left: `${(hovered.x / W) * 100}%` }}
                role="status"
              >
                <strong>{hovered.value.toLocaleString()} XP</strong>
                <span>{fullDate(hovered.date)}</span>
              </div>
            </>
          )}
        </div>
        <div className="xp-chart-axis" aria-hidden="true">
          <span>{dateLabel(first.date, period)}</span>
          <span>{dateLabel(last.date, period)}</span>
        </div>
      </>
    );
  }

  return (
    <div className="xp-chart">
      <div className="xp-chart-header">
        <span className="xp-chart-title">Total XP</span>
        <div className="xp-chart-periods" role="group" aria-label="Chart period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`xp-chart-period${p.id === period ? " is-active" : ""}`}
              aria-pressed={p.id === period}
              onClick={() => {
                setActive(null);
                setPeriod(p.id);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {body}
    </div>
  );
}
