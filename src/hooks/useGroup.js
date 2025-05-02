import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export function useGroup() {
  const { data, error, mutate } = useSWR("/api/wom-group", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  const memberCount = data?.memberships?.length || 0;

  return {
    group: data,
    memberCount,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
