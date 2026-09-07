import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * Races for the progress and profile pages.
 *
 * Previously this fetched /api/races with SWR and returned { races }. Two
 * problems with that: the edge function behind /api/* requires an API key that
 * the browser never sends, so it answered 401 and the hook handed back an error
 * object; and every consumer destructured names this never returned -
 * activeRaces, publicRaces, refreshRaces - so they were all undefined and the
 * pages died on `.filter` of undefined.
 *
 * Reads go straight through supabase-js instead. The races table has a public
 * SELECT policy, so this works for signed-out visitors too, and it drops a
 * round trip through a function that was only ever proxying the same query.
 *
 * @param {string} [userId] - the signed-in user, used to pick out their races
 */
export function useRaces(userId) {
  const [races, setRaces] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Participants are aliased to `participants` because that is what
      // ProfilePage reads when working out which races a member is in.
      const { data, error: fetchError } = await supabase
        .from("races")
        .select("*, participants:race_participants(*)")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRaces(data ?? []);
    } catch (err) {
      console.error("Error fetching races:", err);
      setError(err);
      // An empty list rather than null: callers filter and map over this, and
      // leaving it undefined is what took the pages down in the first place.
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  /**
   * Create a race and its participants.
   *
   * CreateRace.jsx already sends production's shape, so this just writes it.
   * RLS does the authorisation: races_insert_own pins creator_id to the caller,
   * and race_participants_insert_for_own_race only accepts rows for a race the
   * caller created.
   *
   * @param {object} raceData - { creator_id, title, description, public,
   *   end_date, participants: [{ wom_id, player_name, metric, target_value }] }
   * @returns {Promise<object>} the created race row
   */
  const createRace = useCallback(
    async ({ participants = [], ...race }) => {
      const { data: created, error: raceError } = await supabase
        .from("races")
        .insert([race])
        .select()
        .single();

      if (raceError) throw raceError;

      if (participants.length) {
        // start_value and current_value are NOT NULL in production. The sync
        // job fills in real progress later; seeding them at zero keeps the
        // insert valid without inventing numbers here.
        const rows = participants.map((p) => ({
          race_id: created.id,
          wom_id: p.wom_id,
          player_name: p.player_name,
          metric: p.metric,
          target_value: p.target_value,
          start_value: p.start_value ?? 0,
          current_value: p.current_value ?? 0,
        }));

        const { error: participantError } = await supabase
          .from("race_participants")
          .insert(rows);

        if (participantError) throw participantError;
      }

      await fetchRaces();
      return created;
    },
    [fetchRaces]
  );

  const all = races ?? [];

  return {
    races: all,
    createRace,
    // The signed-in member's own races. Empty when signed out, which is what
    // the "My Races" tab should show.
    activeRaces: userId ? all.filter((race) => race.creator_id === userId) : [],
    publicRaces: all.filter((race) => race.public === true),
    loading,
    error,
    refresh: fetchRaces,
    refreshRaces: fetchRaces,
  };
}
