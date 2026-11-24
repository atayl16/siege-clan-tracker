import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";

/**
 * The top three in each WOM competition running now, keyed by competition id:
 * { [competitionId]: [{ place, name, gained }] }.
 *
 * Pass enabled=false when nothing is running, so the request is not made.
 */
export function useCompetitionLeaders(enabled = true) {
  const { data } = useSWR(enabled ? "/api/wom-competition-leaders" : null, fetchJson, {
    // Matches the edge function's cache; standings move slowly enough.
    refreshInterval: 600000,
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });

  const byId = {};
  for (const c of Array.isArray(data) ? data : []) {
    if (c?.competitionId != null && Array.isArray(c.top) && c.top.length) {
      byId[String(c.competitionId)] = c.top;
    }
  }
  return byId;
}
