import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useGroupAchievements(limit = 10) {
  return useSWR(`/api/wom-group-achievements?limit=${limit}`, fetcher, {
    refreshInterval: 300000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
