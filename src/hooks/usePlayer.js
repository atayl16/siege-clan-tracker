import useSWR from "swr";
const fetcher = (url) => fetch(url).then((r) => r.json());
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
