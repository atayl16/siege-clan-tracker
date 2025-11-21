-- Diagnostic Script: Find Why Queries Are Hanging
-- Run this in Supabase SQL Editor while logged in as your user

-- 1. Test if basic queries work
SELECT 'Query Test' as test, COUNT(*) as count FROM members;
SELECT 'Query Test' as test, COUNT(*) as count FROM claim_requests;
SELECT 'Query Test' as test, COUNT(*) as count FROM events;
SELECT 'Query Test' as test, COUNT(*) as count FROM users;

-- 2. Check current role and permissions
SELECT current_user, current_database(), session_user;

-- 3. Check RLS status on tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('members', 'claim_requests', 'events', 'users')
ORDER BY tablename;

-- 4. Check all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('members', 'claim_requests', 'events', 'users')
ORDER BY tablename, policyname;

-- 5. Test if authenticated role can access tables
SET ROLE authenticated;
SELECT 'Authenticated Role Test' as test, COUNT(*) as count FROM members;
SELECT 'Authenticated Role Test' as test, COUNT(*) as count FROM claim_requests;
SELECT 'Authenticated Role Test' as test, COUNT(*) as count FROM events;
RESET ROLE;

-- 6. Check for slow queries or locks
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start,
    state_change
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start;
