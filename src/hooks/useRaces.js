import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

export function useRaces(userId) {
  const { data, error, mutate } = useSWR("/api/races", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  // Process races based on user
  const activeRaces = data?.filter(race =>
    userId && (race.creator_id === userId || race.participants?.some(p => p.user_id === userId))
  ) || [];

  const publicRaces = data?.filter(race => race.public === true) || [];

  return {
    races: data,
    activeRaces,
    publicRaces,
    loading: !data && !error,
    error,
    refreshRaces: mutate,
  };
}

