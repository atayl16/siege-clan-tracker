import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function useGroupAchievements(limit = null) {
  const { data, error, mutate } = useSWR("/api/wom-group-achievements", jsonFetcher, {
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
