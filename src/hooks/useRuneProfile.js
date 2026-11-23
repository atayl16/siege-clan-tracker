import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";

// Edge-cached for 10 minutes (netlify/edge-functions/runeprofile-*.js), so
// there is nothing to gain from refreshing in the background.
const ONCE = { refreshInterval: 0, revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 };

/**
 * The clan's latest RuneProfile activity.
 * @param {"feed"|"page"} [view] feed: the home page's newest 20, every kind;
 *   page: the Achievements page's newest 50, without level-ups and XP
 *   milestones (that page's Wise Old Man milestones have those)
 */
export function useClanActivity(view = "feed") {
  const key = view === "feed" ? "/api/runeprofile-clan-activity" : `/api/runeprofile-clan-activity?view=${view}`;
  const { data, error } = useSWR(key, fetchJson, ONCE);
  return { activities: data?.activities ?? [], loading: !data && !error, error };
}

/**
 * One character's latest RuneProfile activity. Pass a username only when
 * the view is open; null fetches nothing.
 * found is false for a character without RuneProfile.
 */
export function useCharacterActivity(username) {
  const key = username ? `/api/runeprofile-activity?username=${encodeURIComponent(username)}` : null;
  const { data, error } = useSWR(key, fetchJson, ONCE);
  return {
    activities: data?.activities ?? [],
    found: data ? data.found !== false : null,
    loading: Boolean(username) && !data && !error,
    error,
  };
}
