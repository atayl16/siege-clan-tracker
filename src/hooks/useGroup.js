import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";

// Throws on a failed response, so SWR reports an error instead of data.
const fetcher = fetchJson;

export function useGroup() {
  const { data, error, mutate } = useSWR("/api/wom-group", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  const memberCount = data?.memberships?.length || 0;

  return {
    group: data,
    memberCount,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
