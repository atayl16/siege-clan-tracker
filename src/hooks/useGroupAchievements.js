import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useGroupAchievements(limit = null) {
  const { data, error, mutate } = useSWR("/api/wom-group-achievements", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  
  return {
    data: limit && data ? data.slice(0, limit) : data,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}
