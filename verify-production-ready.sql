-- Production Readiness Verification Script
-- Run this in BOTH staging and production to compare
-- Copy output and verify they match

-- 1. Check users table schema
SELECT
    'SCHEMA CHECK' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check trigger exists
SELECT
    'TRIGGER CHECK' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';

-- 3. Check function exists
SELECT
    'FUNCTION CHECK' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';

-- 4. Check RLS policies on users table
SELECT
    'RLS POLICY CHECK' as check_type,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- 5. Check auth vs public users count
SELECT
    'USER COUNT CHECK' as check_type,
    'Auth users' as source,
    COUNT(*) as count
FROM auth.users
WHERE email LIKE '%@siege-clan.com'
UNION ALL
SELECT
    'USER COUNT CHECK' as check_type,
    'Public users' as source,
    COUNT(*) as count
FROM public.users;

-- 6. Check for orphaned auth users (no public.users record)
SELECT
    'ORPHANED AUTH USERS' as check_type,
    a.id,
    a.email,
    a.created_at
FROM auth.users a
WHERE a.email LIKE '%@siege-clan.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = a.id
)
ORDER BY a.created_at DESC;

-- Expected Results:
-- - Schema should have: id, username, password_hash, is_admin, created_at, supabase_auth_id
-- - Trigger should exist: on_auth_user_created on INSERT
-- - Function should exist: handle_new_user
-- - Multiple RLS policies should exist
-- - Auth users count should equal Public users count
-- - No orphaned auth users
