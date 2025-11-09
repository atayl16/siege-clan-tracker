import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

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

