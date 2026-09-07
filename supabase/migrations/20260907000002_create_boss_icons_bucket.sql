-- Migration: public storage bucket for boss icons
--
-- Boss icons are normally bundled assets imported by OsrsIcons.jsx, so a boss
-- added to the game needs a code change and a deploy before it renders. This
-- bucket is the runtime escape hatch: upload `<metric_key>.png` (the WOM metric
-- key, e.g. doom_of_mokhaiotl.png) and BossIcon picks it up on the next page
-- load.
--
-- Public read is intentional. These are game icons served to every visitor, and
-- the frontend builds the URL directly:
--   <SUPABASE_URL>/storage/v1/object/public/boss-icons/<metric_key>.png
-- Public buckets are served without needing a SELECT policy.
--
-- Writes are NOT public. With no INSERT/UPDATE policy on storage.objects for
-- this bucket, only the service role can upload - which is what the Supabase
-- dashboard uses, so uploading through Studio works and anonymous visitors
-- cannot write.
--
-- Sizing still matters: BossStatsPage.css renders icons at a fixed 50x50 with
-- no object-fit, so scale to fit inside 640x480 or the image is visibly
-- squashed. `sips -Z 480 <file>` preserves alpha.

INSERT INTO storage.buckets (id, name, public)
VALUES ('boss-icons', 'boss-icons', true)
ON CONFLICT (id) DO UPDATE SET public = true;
