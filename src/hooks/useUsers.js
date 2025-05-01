import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useUsers() {
  const { data, error, mutate } = useSWR("/api/users", fetcher, {
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
