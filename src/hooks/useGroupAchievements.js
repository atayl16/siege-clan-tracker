import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";

// Throws on a failed response, so SWR reports an error instead of data.
const fetcher = fetchJson;

export function useGroupAchievements(limit = null) {
  const { data, error, mutate } = useSWR("/api/wom-group-achievements", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  
  return {
    data: limit && data ? data.slice(0, limit) : data,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}
