import useSWR from "swr";
import { supabase } from "../supabaseClient";

/**
 * When Siege Score was last reset (siege_score_resets, public read), or null
 * if no reset is recorded or the table is not there yet.
 * @returns {Promise<string|null>} ISO timestamp
 */
export async function fetchLastReset() {
  const { data, error } = await supabase
    .from("siege_score_resets")
    .select("reset_at")
    .order("reset_at", { ascending: false })
    .limit(1);
  if (error) {
    console.warn("Could not load the last Siege Score reset:", error);
    return null;
  }
  return data?.[0]?.reset_at ?? null;
}

/**
 * The last Siege Score reset, loaded once per visit: resets happen a couple
 * of times a year.
 * @returns {{ resetAt: string|null, loading: boolean }}
 */
export function useSiegeScoreReset() {
  const { data, isLoading } = useSWR("siege_score_resets:last", fetchLastReset, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  return { resetAt: data ?? null, loading: isLoading };
}
