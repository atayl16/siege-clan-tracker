-- Fix: Create trigger and backfill missing user records
-- Run this in Supabase SQL Editor

-- Step 1: Check if function exists, create if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'handle_new_user'
        AND pronamespace = 'public'::regnamespace
    ) THEN
        -- Create the function matching actual table schema
        CREATE FUNCTION public.handle_new_user()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        BEGIN
          INSERT INTO public.users (
            id,
            username,
            password_hash,
            supabase_auth_id,
            is_admin,
            created_at
          )
          VALUES (
            new.id,
            COALESCE(
              new.raw_user_meta_data->>'username',
              split_part(new.email, '@', 1)
            ),
            '',  -- Empty string for deprecated password_hash field
            new.id,
            false,
            new.created_at
          )
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            supabase_auth_id = EXCLUDED.supabase_auth_id;

          RETURN new;
        END;
        $func$;

        RAISE NOTICE 'Created handle_new_user function';
    ELSE
        RAISE NOTICE 'Function handle_new_user already exists';
    END IF;
END $$;

-- Step 2: Check if trigger exists, create if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'auth'
        AND event_object_table = 'users'
        AND trigger_name = 'on_auth_user_created'
    ) THEN
        -- Create the trigger
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_user();

        RAISE NOTICE 'Created trigger on_auth_user_created';
    ELSE
        RAISE NOTICE 'Trigger on_auth_user_created already exists';
    END IF;
END $$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 4: Backfill existing auth users to public.users
-- This creates user records for all auth users that are missing from public.users
INSERT INTO public.users (id, username, password_hash, supabase_auth_id, is_admin, created_at)
SELECT
    a.id,
    COALESCE(
        a.raw_user_meta_data->>'username',
        split_part(a.email, '@', 1)
    ) as username,
    '' as password_hash,  -- Empty string for deprecated field
    a.id as supabase_auth_id,
    false as is_admin,
    a.created_at
FROM auth.users a
WHERE a.email LIKE '%@siege-clan.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = a.id
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    supabase_auth_id = EXCLUDED.supabase_auth_id;

-- Step 5: Verify results
SELECT
    'Auth users' as source,
    COUNT(*) as count
FROM auth.users
WHERE email LIKE '%@siege-clan.com'
UNION ALL
SELECT
    'Public users' as source,
    COUNT(*) as count
FROM public.users;

-- Step 6: Show created users
SELECT
    id,
    username,
    is_admin,
    created_at
FROM public.users
ORDER BY created_at DESC;
