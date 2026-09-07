import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * Goals for the progress and profile pages.
 *
 * Was SWR against /api/user-goals, which answers 401 in the browser because the
 * edge function behind /api/* wants an API key the client never sends. `data`
 * came back as an error object, so `userGoals.filter(...)` in ProgressPage
 * threw and the page never painted.
 *
 * Reads go through supabase-js now, governed by RLS: a signed-in member sees
 * their own goals (user_goals_own_rows), and anyone can see goals explicitly
 * marked public (user_goals_public_read). Signed out, that means public goals
 * only - which is what the public goals board wants.
 */
export function useUserGoals(userId) {
  const [userGoals, setUserGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("user_goals").select("*");
      // RLS already limits what comes back; this narrows it further when a
      // caller only wants one member's goals.
      if (userId) query = query.eq("user_id", userId);

      const { data, error: fetchError } = await query.order("created_at", {
        ascending: false,
      });
      if (fetchError) throw fetchError;
      setUserGoals(data ?? []);
    } catch (err) {
      console.error("Error fetching user goals:", err);
      setError(err);
      // Always an array. Handing back undefined is what crashed the page.
      setUserGoals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const all = userGoals ?? [];

  return {
    userGoals: all,
    publicGoals: all.filter((goal) => goal.public === true),
    loading,
    error,
    refresh: fetchGoals,
    refreshGoals: fetchGoals,
  };
}
