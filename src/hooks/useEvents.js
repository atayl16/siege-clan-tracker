import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useEvents() {
  const { data, error, mutate } = useSWR("/api/events", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    events: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}

