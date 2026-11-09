import { supabase } from "../supabaseClient";

/**
 * Ask the server to bring race progress up to date from WiseOldMan
 * (netlify/functions/race-refresh.cjs).
 *
 * Either way the server asks WiseOldMan to pull the racers' current hiscores
 * first. Without `force` this is the refresh the races page does when it
 * opens: anyone may call it, and the server skips races it checked in the
 * last five minutes. With `force` (the Refresh button) that drops to one
 * minute, which needs a signed-in member.
 *
 * @param {string[]} raceIds
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ results: Array<{ raceId: string, status: string, retryAfterSeconds?: number }> }>}
 */
export async function refreshRaceProgress(raceIds, { force = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (force) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Sign in to refresh a race.");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/.netlify/functions/race-refresh", {
    method: "POST",
    headers,
    body: JSON.stringify({ raceIds, force }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Could not refresh the race (${res.status}).`);
  return body;
}
