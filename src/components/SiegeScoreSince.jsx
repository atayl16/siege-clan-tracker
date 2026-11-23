import React from "react";
import { useSiegeScoreReset } from "../hooks/useSiegeScoreReset";
import { formatDate } from "../utils/dates";

/**
 * "Points since scores were last reset on 26 Oct 2026", so a reader knows
 * the standings are not a lifetime total. Shows nothing until it knows the
 * date.
 */
export default function SiegeScoreSince({ className = "" }) {
  const { resetAt } = useSiegeScoreReset();
  if (!resetAt) return null;
  return (
    <p className={`siege-score-since ${className}`.trim()}>
      Points since scores were last reset on {formatDate(resetAt)}.
    </p>
  );
}
