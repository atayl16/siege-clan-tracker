import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchJson } from "../utils/fetchJson";
import { supabase } from "../supabaseClient";
import { xpWeekContaining, rankXpGains } from "../utils/xpWeek";

/** The most recently paid week's winners, from xp_awards (public to read). */
export async function fetchLastAwards() {
  // Two steps rather than one capped query: tied places can pay more than
  // five members, and a fixed row limit could cut a paid winner off.
  const { data: latest, error: latestError } = await supabase
    .from("xp_awards")
    .select("week_start, week_end")
    .order("week_start", { ascending: false })
    .limit(1);
  if (latestError) throw latestError;
  if (!latest?.length) return null;

  const { week_start: weekStart, week_end: weekEnd } = latest[0];
  const { data, error } = await supabase
    .from("xp_awards")
    .select("wom_id, player_name, placement, xp_gained, points_awarded")
    .eq("week_start", weekStart)
    .order("placement", { ascending: true });
  if (error) throw error;

  return {
    start: new Date(weekStart),
    end: new Date(weekEnd),
    winners: data.map((row) => ({
      womId: row.wom_id,
      name: row.player_name,
      gained: Number(row.xp_gained),
      place: row.placement,
      points: row.points_awarded,
    })),
  };
}

/**
 * Every members row's wom_id: the payout's eligibility rule
 * (scripts/sync-tasks/weekly-xp-awards.cjs pays only members), so the live
 * places and points match what is paid. Production's read policy returns
 * every row to the browser, hidden members included, as the service role sees.
 */
async function fetchMemberIds() {
  const { data, error } = await supabase.from("members").select("wom_id");
  if (error) throw error;
  return new Set(data.map((m) => Number(m.wom_id)));
}

/**
 * The XP week now, kept current: it moves on at the Monday 19:00 UK boundary
 * even if the page stays open, and is re-checked when a hidden or suspended
 * tab comes back (timers do not fire on time while a laptop sleeps).
 */
export function useCurrentXpWeek() {
  const [week, setWeek] = useState(() => xpWeekContaining(new Date()));

  useEffect(() => {
    const refresh = () =>
      setWeek((current) => {
        const latest = xpWeekContaining(new Date());
        return latest.start.getTime() === current.start.getTime() ? current : latest;
      });

    // A second past the boundary, so "now" is clearly in the new week.
    const timer = setTimeout(refresh, Math.max(0, week.end.getTime() - Date.now()) + 1000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [week]);

  return week;
}

/**
 * The weekly Overall XP award: this week's live ranking (from WOM, cached at
 * the edge for ten minutes), its top five, and, with { withLastWeek: true },
 * the most recently paid week's winners.
 */
export function useWeeklyXp({ withLastWeek = false } = {}) {
  // The URL is the same all week, so every visitor shares one edge-cached copy.
  const week = useCurrentXpWeek();

  const url =
    `/api/wom-group-gained?startDate=${encodeURIComponent(week.start.toISOString())}` +
    `&endDate=${encodeURIComponent(week.end.toISOString())}`;

  const current = useSWR(url, fetchJson, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  const members = useSWR("members:wom_ids", fetchMemberIds, {
    revalidateOnFocus: false,
    dedupingInterval: 10 * 60 * 1000,
  });

  // Keyed on the week, so the new winners are fetched once a week closes.
  // Refreshed every 15 minutes because the hourly job pays them shortly after.
  // Only callers that show the winners pay for the query and its refresh.
  const last = useSWR(withLastWeek ? `xp_awards:last-week:${week.start.toISOString()}` : null, fetchLastAwards, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  // Everyone eligible with a gain, ranked; the top five are the ones who would
  // be paid. Without the member list the places cannot be checked against the
  // payout, so that is reported as an error rather than shown unchecked.
  const memberIds = members.data;
  const ranking = useMemo(
    () =>
      memberIds
        ? rankXpGains(current.data, {
            limit: Infinity,
            isEligible: (row) => memberIds.has(Number(row.player.id)),
          })
        : [],
    [current.data, memberIds]
  );
  const standings = useMemo(() => ranking.filter((r) => r.points > 0), [ranking]);

  // Either request failing with nothing to show is an error, shown at once;
  // otherwise wait for both, so places do not shift once the member list
  // arrives. SWR keeps the last good data when a refresh fails, so a failed
  // background refresh keeps showing it rather than replacing it with an error.
  const error = (!current.data && current.error) || (!members.data && members.error) || undefined;

  return {
    week,
    ranking,
    standings,
    loading: !error && (!current.data || !members.data),
    error,
    lastWeek: last.data ?? null,
    lastWeekLoading: withLastWeek && last.data === undefined && !last.error,
    lastWeekError: last.error,
  };
}
