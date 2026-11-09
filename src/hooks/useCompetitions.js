import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";

// Throws on a failed response, so SWR reports an error instead of data.
const fetcher = fetchJson;

export function useCompetitions() {
  const { data, error, mutate } = useSWR("/api/wom-competitions", fetcher, {
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
