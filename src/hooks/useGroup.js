import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

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
