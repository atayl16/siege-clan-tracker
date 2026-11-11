-- Migration: award_competition_points stores progress as numeric
--
-- The production function cast each participant's progress to int:
--
--   (point_record->>'progress')::int
--
-- WOM reports progress for EHB and EHP competitions as fractional hours
-- (19.75566), and Postgres cannot cast that text to int, so the whole award
-- failed: "invalid input syntax for type integer". The function is all or
-- nothing, so no points were written, but nobody in the competition got
-- points either, and the hourly sync retried and failed every hour. First
-- seen on competition 158975 on 2026-11-11.
--
-- event_results.progress is already NUMERIC (20260907000013), so the value
-- fits once it is cast to numeric. Nothing else changes: this is the
-- function exactly as it is in production (pg_get_functiondef, 2026-11-11)
-- with that one cast changed. The function was not in the migrations before,
-- so a database built from them now has it too.
--
-- Idempotent: CREATE OR REPLACE keeps the owner and grants. Apply to
-- production by hand in the SQL editor.

CREATE OR REPLACE FUNCTION public.award_competition_points(competition_id bigint, points_data jsonb, member_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb;
  member_update jsonb;
  point_record jsonb;
BEGIN
  -- Check if this competition is already processed
  PERFORM 1 FROM events WHERE wom_id = competition_id AND points_processed = TRUE;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  -- Start transaction scope
  BEGIN
    -- Insert all the event results
    FOR point_record IN SELECT * FROM jsonb_array_elements(points_data)
    LOOP
      INSERT INTO event_results (
        event_id,
        wom_id,
        player_name,
        placement,
        points_awarded,
        progress
      ) VALUES (
        (point_record->>'event_id')::uuid,         -- Cast to UUID explicitly
        (point_record->>'wom_id')::bigint,         -- Cast to BIGINT explicitly
        point_record->>'player_name',
        (point_record->>'placement')::int,
        (point_record->>'points_awarded')::int,
        (point_record->>'progress')::numeric       -- EHB/EHP progress is fractional
      );
    END LOOP;

    -- Update all members' scores
    FOR member_update IN SELECT * FROM jsonb_array_elements(member_updates)
    LOOP
      UPDATE members
      SET siege_score = (member_update->>'newScore')::int
      WHERE wom_id = (member_update->>'wom_id')::bigint;  -- Cast to BIGINT explicitly
    END LOOP;

    -- Mark the competition as processed
    UPDATE events
    SET points_processed = TRUE,
        status = 'completed',
        processing_started_at = NULL
    WHERE wom_id = competition_id;

    result = jsonb_build_object('status', 'success', 'updated_members', jsonb_array_length(member_updates));
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- Roll back the entire transaction on any error
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
  END;
END;
$function$;
