import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function useCompetitions() {
  const { data, error, mutate } = useSWR("/api/wom-competitions", jsonFetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    competitions: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
