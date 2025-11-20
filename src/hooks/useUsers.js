import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function useUsers() {
  const { data, error, mutate } = useSWR("/api/users", jsonFetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    users: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
