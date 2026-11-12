import { useMemo } from "react";
import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";
import { supabase } from "../supabaseClient";
import { xpWeekContaining, rankXpGains } from "../utils/xpWeek";

/** The most recently paid week's winners, from xp_awards (public to read). */
async function fetchLastAwards() {
  const { data, error } = await supabase
    .from("xp_awards")
    .select("week_start, week_end, wom_id, player_name, placement, xp_gained, points_awarded")
    .order("week_start", { ascending: false })
    .order("placement", { ascending: true })
    .limit(20);
  if (error) throw error;
  if (!data?.length) return null;

  const weekStart = data[0].week_start;
  return {
    start: new Date(weekStart),
    end: new Date(data[0].week_end),
    winners: data
      .filter((row) => row.week_start === weekStart)
      .map((row) => ({
        womId: row.wom_id,
        name: row.player_name,
        gained: Number(row.xp_gained),
        place: row.placement,
        points: row.points_awarded,
      })),
  };
}

/**
 * The weekly Overall XP award: this week's live ranking (from WOM, cached at
 * the edge for ten minutes), its top five, and the last paid week's winners.
 */
export function useWeeklyXp() {
  // Fixed for the life of the page: the URL stays the same all week, so the
  // edge cache is shared by every visitor.
  const week = useMemo(() => xpWeekContaining(new Date()), []);

  const url =
    `/api/wom-group-gained?startDate=${encodeURIComponent(week.start.toISOString())}` +
    `&endDate=${encodeURIComponent(week.end.toISOString())}`;

  const current = useSWR(url, fetchJson, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  const last = useSWR("xp_awards:last-week", fetchLastAwards, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  // Everyone with a gain, ranked; the top five are the ones who would be paid.
  const ranking = useMemo(
    () => rankXpGains(current.data, { limit: Infinity }),
    [current.data]
  );
  const standings = useMemo(() => ranking.filter((r) => r.points > 0), [ranking]);

  return {
    week,
    ranking,
    standings,
    loading: !current.data && !current.error,
    error: current.error,
    lastWeek: last.data ?? null,
    lastWeekError: last.error,
  };
}
