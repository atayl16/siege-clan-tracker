import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

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

    const members = data.members || [];
    const visibleMembers = members.filter((m) => !m.hidden);

    // Calculate maxed combat, total, and 200m counts
    const maxedCombatCount = visibleMembers.filter(
      (m) => m.combatLevel === 126
    ).length;

    const maxedTotalCount = visibleMembers.filter(
      (m) => parseInt(m.current_lvl) === 2277
    ).length;

    const maxed200msCount = visibleMembers.filter(
      (m) => m.skills?.overall?.experience >= 200_000_000
    ).length;

    // Calculate average stats
    const averageStats = data.averageStats || {};

    return {
      maxedCombatCount,
      maxedTotalCount,
      maxed200msCount,
      averageStats,
    };
  }, [data]);

  return {
    data: processedStats,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}
