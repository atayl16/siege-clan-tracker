-- Migration: free-tier usage snapshots
--
-- The Usage Check workflow (scripts/sync-tasks/usage-check.cjs) reads
-- Netlify and Supabase usage and stores one row per metric per day here.
-- The admin Alerts tab shows the latest row for each metric, through the
-- admin-usage Netlify function.
--
-- Service role only: RLS is on with no policies, so the browser cannot read
-- or write it directly. A few rows a day; the check deletes rows older than
-- about a year.

CREATE TABLE IF NOT EXISTS public.usage_snapshots (
  metric        TEXT        NOT NULL,
  taken_on      DATE        NOT NULL,
  used          NUMERIC     NOT NULL CHECK (used >= 0),
  usage_limit   NUMERIC     NOT NULL CHECK (usage_limit > 0),
  unit          TEXT        NOT NULL,
  period_start  DATE,
  period_end    DATE,
  projected     NUMERIC,
  level         TEXT        NOT NULL CHECK (level IN ('ok', 'watch', 'problem')),
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (metric, taken_on)
);

ALTER TABLE public.usage_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_snapshots TO service_role;

-- Database size, as Supabase measures it for the Free plan's 500 MB: the
-- sum of pg_database_size over the databases (the query in Supabase's
-- "Database size" docs). Databases this role may not connect to are left
-- out rather than raising an error.
CREATE OR REPLACE FUNCTION public.usage_database_bytes()
 RETURNS BIGINT
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = pg_catalog
AS $function$
  SELECT COALESCE(SUM(pg_database_size(oid)), 0)::BIGINT
  FROM pg_database
  WHERE has_database_privilege(oid, 'CONNECT');
$function$;

REVOKE ALL ON FUNCTION public.usage_database_bytes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_database_bytes() TO service_role;
