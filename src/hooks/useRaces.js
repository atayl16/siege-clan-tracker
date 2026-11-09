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

  /**
   * Save an edited race: its own fields, then its participants.
   *
   * Participants are matched by id: rows the form still has are updated,
   * rows it dropped are deleted, and rows without an id are inserted. RLS
   * limits all of it to the race's creator (races_update_own and the
   * race_participants update/delete/insert policies).
   *
   * These are separate requests, not one transaction: if a later step fails,
   * earlier ones stay saved and the error is reported. Removals run last so
   * a failure part-way never loses a participant. Every write is checked
   * for the rows it actually changed, because RLS rejects a write it does not
   * allow by matching zero rows rather than raising - which is what happens
   * if the participant policies migration has not been applied.
   *
   * @param {string} raceId
   * @param {object} raceData - { title, description, public, end_date,
   *   participants: [{ id?, wom_id, player_name, metric, target_value }],
   *   originalParticipantIds: ids the form was opened with }
   */
  const updateRace = useCallback(
    async (raceId, { participants = [], originalParticipantIds, ...race }) => {
      const notSaved = (what) =>
        new Error(
          `${what} was not saved. You may not have permission to edit this race.`
        );

      const { data: updatedRace, error: raceError } = await supabase
        .from("races")
        .update(race)
        .eq("id", raceId)
        .select("id");
      if (raceError) throw raceError;
      if (!updatedRace?.length) throw notSaved("The race");

      const { data: existing, error: readError } = await supabase
        .from("race_participants")
        .select("id, wom_id, metric")
        .eq("race_id", raceId);
      if (readError) throw readError;
      const existingById = new Map((existing ?? []).map((p) => [p.id, p]));

      // Every row the form kept must belong to this race. Guards against a
      // form left holding another race's rows writing into that race.
      const kept = participants.filter((p) => p.id);
      for (const p of kept) {
        if (!existingById.has(p.id)) {
          throw new Error("This race changed since you opened it. Reload and try again.");
        }
      }

      // Delete only rows the user removed from what the form opened with, so
      // a participant added elsewhere since then is left alone.
      const keptIds = new Set(kept.map((p) => p.id));
      const opened = new Set(originalParticipantIds ?? existingById.keys());
      const removedIds = [...existingById.keys()].filter(
        (id) => opened.has(id) && !keptIds.has(id)
      );

      for (const p of kept) {
        const before = existingById.get(p.id);
        const changes = {
          wom_id: p.wom_id,
          player_name: p.player_name,
          metric: p.metric,
          target_value: p.target_value,
        };
        // Progress belongs to a character and metric; a new one starts over.
        if (Number(before.wom_id) !== Number(p.wom_id) || before.metric !== p.metric) {
          changes.start_value = 0;
          changes.current_value = 0;
        }
        const { data: updated, error } = await supabase
          .from("race_participants")
          .update(changes)
          .eq("race_id", raceId)
          .eq("id", p.id)
          .select("id");
        if (error) throw error;
        if (!updated?.length) throw notSaved(`${p.player_name}'s entry`);
      }

      const added = participants.filter((p) => !p.id);
      if (added.length) {
        const { error } = await supabase.from("race_participants").insert(
          added.map((p) => ({
            race_id: raceId,
            wom_id: p.wom_id,
            player_name: p.player_name,
            metric: p.metric,
            target_value: p.target_value,
            start_value: 0,
            current_value: 0,
          }))
        );
        if (error) throw error;
      }

      // Removals go last: if an earlier step fails, the race is left with an
      // extra row rather than a lost one.
      if (removedIds.length) {
        const { data: deleted, error } = await supabase
          .from("race_participants")
          .delete()
          .eq("race_id", raceId)
          .in("id", removedIds)
          .select("id");
        if (error) throw error;
        if ((deleted?.length ?? 0) !== removedIds.length) {
          throw notSaved("Removing participants");
        }
      }

      await fetchRaces();
    },
    [fetchRaces]
  );

  const all = races ?? [];

  return {
    races: all,
    createRace,
    updateRace,
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
