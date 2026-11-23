import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";
// Throws on a failed response, so SWR reports an error instead of data.
const fetcher = fetchJson;
/**
 * One character's Wise Old Man profile, from the edge-cached /api/wom-player.
 * Refreshes every 5 minutes by default; pass { refreshInterval: 0 } for a
 * view that only needs it once (the profile's Achievements tab), so an open
 * tab costs no further calls.
 */
export function usePlayer(id, options = {}) {
  const { data, error, mutate } = useSWR(
    id ? `/api/wom-player?id=${id}` : null,
    fetcher,
    {
      refreshInterval: 300000,
      dedupingInterval: 60000,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      ...options,
    }
  );
  return { player: data, loading: !data && !error, error, refresh: mutate };
}
