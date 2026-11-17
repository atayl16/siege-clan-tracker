import { useMemo } from "react";
import useSWR from "swr";
import { supabase } from "../supabaseClient";
import { useCurrentXpWeek, fetchLastAwards } from "./useWeeklyXp";
import { WEEKLY_TITLES, GAINER, rankTitle } from "../utils/weeklyTitles";

const REFRESH = 10 * 60 * 1000;

/** This week's live standings, written hourly by scripts/sync-tasks/weekly-titles.cjs. */
async function fetchStandings(weekStartIso) {
  const { data, error } = await supabase
    .from("weekly_title_standings")
    .select("title, wom_id, player_name, value, updated_at")
    .eq("week_start", weekStartIso);
  if (error) throw error;
  return data;
}

/** The 1st places of the most recently awarded week, by title id. */
async function fetchTitleHolders() {
  const { data: weeks, error: weeksError } = await supabase
    .from("weekly_title_weeks")
    .select("week_start, week_end")
    .order("week_start", { ascending: false })
    .limit(1);
  if (weeksError) throw weeksError;
  if (!weeks?.length) return null;

  const { week_start: weekStart, week_end: weekEnd } = weeks[0];
  const { data, error } = await supabase
    .from("weekly_title_awards")
    .select("title, wom_id, player_name, value")
    .eq("week_start", weekStart)
    .eq("placement", 1);
  if (error) throw error;

  const byTitle = {};
  for (const row of data) {
    (byTitle[row.title] ||= []).push({ womId: row.wom_id, name: row.player_name, value: Number(row.value) });
  }
  return { start: new Date(weekStart), end: new Date(weekEnd), byTitle };
}

/**
 * Every title race this week: [{ title, top, entrants, updatedAt }], in the
 * config's order. `top` is the places that would earn points if the week
 * ended now; `entrants` is everyone who has gained anything in the race.
 */
export function useTitleRaces() {
  const week = useCurrentXpWeek();
  const key = `weekly_title_standings:${week.start.toISOString()}`;
  const { data, error } = useSWR(key, () => fetchStandings(week.start.toISOString()), {
    refreshInterval: REFRESH,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  const races = useMemo(() => {
    if (!data) return [];
    return WEEKLY_TITLES.map((title) => {
      const rows = data
        .filter((r) => r.title === title.id)
        .map((r) => ({ womId: r.wom_id, name: r.player_name, value: Number(r.value) }));
      return { title, top: rankTitle(title, rows), entrants: rows.length };
    });
  }, [data]);

  const updatedAt = useMemo(() => {
    if (!data?.length) return null;
    return new Date(Math.max(...data.map((r) => Date.parse(r.updated_at))));
  }, [data]);

  return { week, races, updatedAt, loading: !data && !error, error };
}

/**
 * Who holds each title now: The Gainer (last paid weekly XP week's 1st) and
 * each title's 1st from the last awarded week. Ties at 1st share a title.
 *
 *   holders   [{ title, players: [{ womId, name, value }], week }], The
 *             Gainer first, then the config's order; titles nobody won left out
 *   byMember  Map womId -> [titles held], for the marks next to names
 */
export function useTitleHolders() {
  const week = useCurrentXpWeek();
  const titles = useSWR(`weekly_title_holders:${week.start.toISOString()}`, fetchTitleHolders, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });
  // Same key as useWeeklyXp's last-week fetch, so SWR shares one request.
  const gainer = useSWR(`xp_awards:last-week:${week.start.toISOString()}`, fetchLastAwards, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  return useMemo(() => {
    const holders = [];
    const gainerWinners = (gainer.data?.winners || []).filter((w) => w.place === 1);
    if (gainerWinners.length) {
      holders.push({
        title: GAINER,
        players: gainerWinners.map((w) => ({ womId: w.womId, name: w.name, value: w.gained })),
        week: { start: gainer.data.start, end: gainer.data.end },
      });
    }
    if (titles.data) {
      for (const title of WEEKLY_TITLES) {
        const players = titles.data.byTitle[title.id];
        if (players?.length) {
          holders.push({ title, players, week: { start: titles.data.start, end: titles.data.end } });
        }
      }
    }

    const byMember = new Map();
    for (const { title, players } of holders) {
      for (const p of players) {
        const id = Number(p.womId);
        byMember.set(id, [...(byMember.get(id) || []), title]);
      }
    }

    return {
      holders,
      byMember,
      // Each fetch resolves to null when nothing has been awarded yet, so
      // only undefined means still loading.
      loading:
        (titles.data === undefined && !titles.error) || (gainer.data === undefined && !gainer.error),
      error: titles.error || gainer.error,
    };
  }, [titles.data, titles.error, gainer.data, gainer.error]);
}
