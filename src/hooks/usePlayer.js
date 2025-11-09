import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};
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
