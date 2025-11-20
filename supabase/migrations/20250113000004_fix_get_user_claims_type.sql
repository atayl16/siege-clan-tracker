-- Migration: Fix get_user_claims function type mismatch
-- Description: Fix all type mismatches to match the members table schema
-- wom_id: integer -> bigint
-- siege_score: numeric -> integer

-- Drop the existing function first (required to change return type)
DROP FUNCTION IF EXISTS public.get_user_claims(uuid);

-- Recreate with correct types matching members table
CREATE OR REPLACE FUNCTION public.get_user_claims(user_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  wom_id bigint,         -- Changed from integer to bigint
  claimed_at timestamp with time zone,
  name text,
  current_lvl integer,
  ehb numeric,
  siege_score integer    -- Changed from numeric to integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.claimed_by AS user_id,
    m.wom_id,
    m.updated_at AS claimed_at,
    m.name,
    m.current_lvl,
    m.ehb,
    m.siege_score
  FROM members m
  WHERE m.claimed_by = user_id_param;
END;
$function$;

-- Comment
COMMENT ON FUNCTION public.get_user_claims(uuid) IS
  'Returns all member claims for a given user. Fixed to match members table schema exactly.';
