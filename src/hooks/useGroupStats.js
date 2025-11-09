import useSWR from "swr";
import { useMemo } from "react";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

function formatDisplayName(name) {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function useGroupStats(limit = null) {
  const { data, error, mutate } = useSWR(
    "/api/wom-group-stats",
    fetcher,
    {
      refreshInterval: 60000,
      dedupingInterval: 30000,
      revalidateOnMount: true,
      revalidateOnFocus: false,
    }
  );

  return {
    data: limit && data ? data.slice(0, limit) : data,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}

export function useGroupBossStats() {
  const { data, error, mutate } = useGroupStats();

  // Process only the bosses and activities data
  const processedData = data
    ? {
        bosses: Object.entries(data.metricLeaders?.bosses || {})
          .map(([name, stats]) => ({
            metric: name,
            displayName: formatDisplayName(name),
            kills: stats.kills,
            rank: stats.rank,
            player: stats.player,
          }))
          .filter((boss) => boss.player), // Filter out null players

        activities: Object.entries(data.metricLeaders?.activities || {})
          .map(([name, stats]) => ({
            metric: name,
            displayName: formatDisplayName(name),
            score: stats.score,
            rank: stats.rank,
            player: stats.player,
          }))
          .filter((activity) => activity.player), // Filter out null players
      }
    : null;

  return {
    data: processedData,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}

export function useClanStats() {
  const { data, error, mutate } = useGroupStats();

  const processedStats = useMemo(() => {
    if (!data) return null;

    // Directly use the stats provided by the API
    const { maxedCombatCount, maxedTotalCount, maxed200msCount, averageStats } = data;

    // Extract average level and experience from nested structure
    const averageLevel = averageStats?.data?.skills?.overall?.level || 0;
    const averageExperience = averageStats?.data?.skills?.overall?.experience || 0;

    return {
      maxedCombatCount,
      maxedTotalCount,
      maxed200msCount,
      averageLevel,
      averageExperience,
    };
  }, [data]);

  return {
    data: processedStats,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}
