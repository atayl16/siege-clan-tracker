import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function usePlayer(id) {
  const { data, error, mutate } = useSWR(
    id ? `/api/wom-player?id=${id}` : null,
    jsonFetcher,
    {
      refreshInterval: 300000,
      dedupingInterval: 60000,
      revalidateOnMount: true,
      revalidateOnFocus: false,
    }
  );
  return { player: data, loading: !data && !error, error, refresh: mutate };
}
