import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export function useMembers() {
  const { data, error, mutate } = useSWR("/api/members", fetcher, {
    refreshInterval: 300000,
    dedupingInterval: 60000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return { members: data, loading: !data && !error, error, refresh: mutate };
}
