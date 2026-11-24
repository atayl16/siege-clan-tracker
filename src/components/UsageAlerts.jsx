import React, { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import Badge from "./ui/Badge";
import "./UsageAlerts.css";

const LEVELS = {
  ok: { label: "OK", variant: "success" },
  watch: { label: "Watch", variant: "warning" },
  problem: { label: "Near Limit", variant: "danger" },
};

// The check runs twice a day; a reading older than this means it has stopped.
const STALE_DAYS = 3;

function share(value, limit) {
  if (!(limit > 0) || value == null) return null;
  return Math.max(0, (value / limit) * 100);
}

function daysOld(isoDate, now) {
  return Math.floor((now - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000));
}

function projectionText(item) {
  const s = item.snapshot;
  if (s.projected == null) return "Too early in the period to project";
  const pct = Math.round(share(s.projected, s.usage_limit));
  return item.kind === "cumulative"
    ? `On course for ${s.projected_text} (${pct}%) by ${s.period_end}`
    : `On course for ${s.projected_text} (${pct}%) in 30 days`;
}

function UsageRow({ item, now }) {
  const s = item.snapshot;
  if (!s) {
    return (
      <li className="ui-usage-row">
        <div className="ui-usage-heading">
          <span className="ui-usage-label">{item.label}</span>
          <Badge variant="secondary">No Reading</Badge>
        </div>
        <p className="ui-usage-note">
          The Usage Check workflow has not stored a reading for this yet.
        </p>
      </li>
    );
  }

  const level = LEVELS[s.level] || LEVELS.ok;
  const usedPct = share(s.used, s.usage_limit);
  const projectedPct = share(s.projected, s.usage_limit);
  const age = daysOld(s.checked_at, now);

  return (
    <li className={`ui-usage-row ui-usage-${s.level}`}>
      <div className="ui-usage-heading">
        <span className="ui-usage-label">{item.label}</span>
        <Badge variant={level.variant}>{level.label}</Badge>
      </div>
      <div
        className="ui-usage-meter"
        role="meter"
        aria-label={`${item.label} used`}
        aria-valuemin={0}
        aria-valuemax={s.usage_limit}
        aria-valuenow={s.used}
        aria-valuetext={`${s.used_text} of ${s.limit_text}`}
      >
        <div className="ui-usage-fill" style={{ width: `${Math.min(100, usedPct)}%` }} />
        {projectedPct != null && (
          <div
            className="ui-usage-projection"
            style={{ left: `${Math.min(100, projectedPct)}%` }}
            title="Projected"
          />
        )}
      </div>
      <div className="ui-usage-figures">
        <span>
          <strong>{s.used_text}</strong> of {s.limit_text} ({Math.round(usedPct)}%)
        </span>
        <span>{projectionText(item)}</span>
      </div>
      {age >= STALE_DAYS && (
        <p className="ui-usage-note ui-usage-stale">
          Last reading {age} days ago. Check the Usage Check workflow on GitHub.
        </p>
      )}
    </li>
  );
}

/**
 * Free-tier usage for the Alerts tab, from the snapshots the Usage Check
 * workflow stores (scripts/sync-tasks/usage-check.cjs). Watch: 50% used, or
 * on course for 80%. Near Limit: 80% used, or on course for 100%; that level
 * also opens a GitHub issue.
 */
export default function UsageAlerts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again to see usage.");
      const res = await fetch("/.netlify/functions/admin-usage", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not load usage.");
      setData(body.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading usage...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-message ui-message-error">
        <FaExclamationTriangle className="ui-message-icon" />
        <span>{error.message || String(error)}</span>
      </div>
    );
  }

  const metrics = data?.metrics || [];
  const now = Date.now();
  const allOk = metrics.length > 0 && metrics.every((m) => m.snapshot?.level === "ok");
  const dashboards = [...new Map(metrics.map((m) => [m.dashboard, m])).values()];

  return (
    <div className="ui-usage">
      {allOk && (
        <div className="ui-no-alerts">
          <FaCheck className="ui-success-icon" />
          <span>Everything readable is well inside the free tiers</span>
        </div>
      )}
      <ul className="ui-usage-list">
        {metrics.map((item) => (
          <UsageRow key={item.metric} item={item} now={now} />
        ))}
      </ul>
      {data?.unreadable?.length > 0 && (
        <div className="ui-usage-unreadable">
          <p>Not checked here, because neither provider reports them by API:</p>
          <ul>
            {data.unreadable.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <p>
            Look at these on the usage pages:{" "}
            {dashboards.map((m, i) => (
              <React.Fragment key={m.dashboard}>
                {i > 0 && ", "}
                <a href={m.dashboard} target="_blank" rel="noopener noreferrer">
                  {m.provider} {m.dashboardPage}
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
