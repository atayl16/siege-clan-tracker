import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function useUserGoals() {
  const { data, error, mutate } = useSWR("/api/user-goals", jsonFetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    userGoals: data || [],
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}

