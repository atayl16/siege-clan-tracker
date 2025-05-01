import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

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
