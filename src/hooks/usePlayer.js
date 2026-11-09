import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";
// Throws on a failed response, so SWR reports an error instead of data.
const fetcher = fetchJson;
export function usePlayer(id) {
  const { data, error, mutate } = useSWR(
    id ? `/api/wom-player?id=${id}` : null,
    fetcher,
    {
      refreshInterval: 300000,
      dedupingInterval: 60000,
      revalidateOnMount: true,
      revalidateOnFocus: false,
    }
  );
  return { player: data, loading: !data && !error, error, refresh: mutate };
}
