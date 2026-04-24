-- Deterministic seed data for smoke tests.
-- Applied by `supabase db reset` after migrations.
-- Every render path in the UI should have a representative row.

BEGIN;

-- Clear existing data (safe: supabase db reset rebuilt the schema first).
TRUNCATE race_participants, races, events, user_goals, claim_requests, player_claims, claim_codes, sync_logs RESTART IDENTITY CASCADE;
DELETE FROM members;
DELETE FROM users;

-- ============================================================
-- USERS
-- One admin user for admin-page smoke tests.
-- ============================================================
INSERT INTO users (id, username, password_hash, is_admin) VALUES
  ('00000000-0000-0000-0000-000000000001', 'smoke-admin', 'test-password-hash', true),
  ('00000000-0000-0000-0000-000000000002', 'smoke-user',  'test-password-hash', false);

-- ============================================================
-- MEMBERS
-- 15 rows. Public site shows 13 (1 hidden + 1 left_date excluded).
-- WOM IDs 900001-900015 so they can't collide with real data.
-- ============================================================

-- Admin ranks: owner, deputy_owner (tests the titleize fix), general
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, name_history)
VALUES
  (900001, 'Smoke Owner',        'smoke owner',        'owner',         2277, 400000000, 300000000, 2100,  500, 100, 'main', 'regular', '2023-01-01', '[]'::jsonb),
  (900002, 'Smoke Deputy',       'smoke deputy',       'deputy_owner',  2200, 350000000, 250000000, 2050,  400,  80, 'main', 'regular', '2023-02-01', '[]'::jsonb),
  (900003, 'Smoke General',      'smoke general',      'general',       2100, 300000000, 200000000, 1950,  350,  70, 'main', 'regular', '2023-03-01', '[]'::jsonb);

-- Skiller tiers: clan XP (current_xp - first_xp) drives tier
-- Opal = 0-3M, Sapphire = 3-8M, Diamond = 40-90M, Zenyte = 500M+
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, name_history)
VALUES
  (900004, 'Smoke Opal',      'smoke opal',      'opal',      1500,   5000000,   5000000, 1500,  10,  0, 'main', 'regular', '2025-10-01', '[]'::jsonb),
  (900005, 'Smoke Sapphire',  'smoke sapphire',  'sapphire',  1800,  10000000,   5000000, 1700,  20, 10, 'main', 'regular', '2025-08-15', '[]'::jsonb),
  (900006, 'Smoke Diamond',   'smoke diamond',   'diamond',   2050,  90000000,  40000000, 1900,  50, 30, 'main', 'regular', '2024-12-01', '["diamondOldName"]'::jsonb),
  (900007, 'Smoke Zenyte',    'smoke zenyte',    'zenyte',    2277, 700000000, 100000000, 2200,  80, 50, 'main', 'regular', '2024-06-10', '[]'::jsonb);

-- Fighter tiers: EHB drives tier
-- Mentor = 0-100, Prefect = 100-300, Superior = 700-900, TzKal = 1500+
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, name_history)
VALUES
  (900008, 'Smoke Mentor',     'smoke mentor',     'mentor',     1800,  50000000, 50000000, 1800,   50,  5, 'main', 'regular', '2025-11-01', '[]'::jsonb),
  (900009, 'Smoke Prefect',    'smoke prefect',    'prefect',    1900,  80000000, 70000000, 1850,  200, 20, 'main', 'regular', '2025-09-10', '[]'::jsonb),
  (900010, 'Smoke Superior',   'smoke superior',   'superior',   2100, 200000000, 180000000, 2000, 800, 60, 'main', 'regular', '2024-11-15', '[]'::jsonb),
  (900011, 'Smoke TzKal',      'smoke tzkal',      'tzkal',      2277, 500000000, 300000000, 2200, 1600, 90, 'main', 'regular', '2024-03-01', '[]'::jsonb);

-- Ironman variants: tests player_type rendering
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, name_history)
VALUES
  (900012, 'Smoke Iron',     'smoke iron',     'emerald',  1800,  10000000,  2000000, 1500,  30, 10, 'main', 'ironman',  '2025-05-01', '[]'::jsonb),
  (900013, 'Smoke Hardcore', 'smoke hardcore', 'ruby',     1950,  20000000,  5000000, 1600,  40, 15, 'main', 'hardcore', '2025-07-15', '[]'::jsonb);

-- Hidden: should not appear on public members page (but will in admin).
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, hidden, name_history)
VALUES
  (900014, 'Smoke Hidden',   'smoke hidden',   'dragonstone', 2000, 100000000, 40000000, 1900, 100, 25, 'main', 'regular', '2025-02-01', true, '[]'::jsonb);

-- Left the clan: left_date set — should never render on public or admin lists (filter is left_date IS NULL).
INSERT INTO members
  (wom_id, name, wom_name, womrole, current_lvl, current_xp, first_xp, first_lvl, ehb, siege_score, build, player_type, join_date, left_date, active, notes, name_history)
VALUES
  (900015, 'Smoke LeftMember', 'smoke leftmember', 'sapphire', 1700,  8000000,  5000000, 1600, 25, 5, 'main', 'regular', '2024-08-01', '2026-01-15', false, 'Automatically marked inactive', '[]'::jsonb);

-- ============================================================
-- EVENTS
-- ============================================================
INSERT INTO events (id, name, description, start_date, end_date, event_type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Smoke Event Upcoming', 'Upcoming boss event',   NOW() + INTERVAL '7 days',  NOW() + INTERVAL '14 days', 'pvm'),
  ('10000000-0000-0000-0000-000000000002', 'Smoke Event Past',     'Past boss event',       NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days',  'pvm');

-- ============================================================
-- RACES & PARTICIPANTS
-- ============================================================
INSERT INTO races (id, name, description, start_date, end_date, metric) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Smoke Race Overall XP', 'Test race', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'overall');

INSERT INTO race_participants (race_id, wom_id, start_value, end_value) VALUES
  ('20000000-0000-0000-0000-000000000001', 900006, 40000000, 45000000),
  ('20000000-0000-0000-0000-000000000001', 900011, 300000000, 310000000);

-- ============================================================
-- USER GOALS
-- ============================================================
INSERT INTO user_goals (user_id, wom_id, goal_type, target_value, current_value, completed) VALUES
  ('00000000-0000-0000-0000-000000000002', 900006, 'overall_xp', 100000000, 90000000, false);

COMMIT;
