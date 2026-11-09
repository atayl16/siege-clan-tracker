import useSWR from "swr";

async function fetchEvents(url) {
  const res = await fetch(url);
  if (!res.ok) {
    // Throw so SWR reports an error, instead of handing { error } to the
    // component as if it were the event list.
    throw new Error(`Failed to load events (${res.status})`);
  }
  return res.json();
}

/**
 * The WOM competitions a player is currently in, with their placement.
 * @param {number|string|null} womId - members.wom_id; null skips the request
 */
export function usePlayerEvents(womId) {
  const { data, error } = useSWR(
    womId ? `/api/wom-player-events?id=${womId}` : null,
    fetchEvents,
    {
      // Matches the edge function's cache; standings move slowly enough.
      refreshInterval: 600000,
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    events: Array.isArray(data) ? data : [],
    loading: Boolean(womId) && !data && !error,
    error,
  };
}
