import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

export function useRaces(userId) {
  const { data, error, mutate } = useSWR("/api/races", jsonFetcher, {
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

  // Function to create a new race
  const createRace = async (raceData) => {
    const res = await fetch("/api/races", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(raceData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
    }

    const newRace = await res.json();

    // Revalidate the SWR cache to include the new race
    mutate();

    return newRace;
  };

  return {
    races: data,
    activeRaces,
    publicRaces,
    loading: !data && !error,
    error,
    refreshRaces: mutate,
    createRace,
  };
}

