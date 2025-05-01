import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useUserGoals() {
  const { data, error, mutate } = useSWR("/api/user-goals", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    userGoals: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}

