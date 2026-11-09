import { supabase } from "../supabaseClient";

/**
 * A player's current stats, pulled fresh from the hiscores by WiseOldMan
 * (netlify/functions/player-refresh.cjs). Use it wherever a number is about to
 * be recorded as a starting point, or a member asked for an update.
 *
 * Unlike /api/wom-player (WOM's saved snapshot, cached for up to ten minutes),
 * this reflects XP gained since WOM last looked. `updated` is false when WOM
 * could not refresh the player just now and its saved snapshot came back.
 *
 * @param {number} womId
 * @returns {Promise<{ womId: number, updated: boolean, latestSnapshot: { data: object } }>}
 * @throws when signed out or when WiseOldMan has nothing for the player
 */
export async function fetchFreshPlayerStats(womId) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sign in to get your latest stats.");

  const res = await fetch("/.netlify/functions/player-refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ womId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Could not get the latest stats (${res.status}).`);
  return body;
}
