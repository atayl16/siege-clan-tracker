-- Migration: Auto-Create Users via Database Trigger
-- Description: Creates database trigger to automatically create public.users records
--              when new users sign up via Supabase Auth
-- Date: 2025-01-16

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user record with data from auth.users
  INSERT INTO public.users (
    id,
    username,
    email,
    supabase_auth_id,
    is_admin,
    created_at
  )
  VALUES (
    new.id,  -- Use auth.users.id as primary key
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),  -- Extract username from metadata or email
    new.email,
    new.id,  -- Same as id, but explicit for clarity
    false,   -- Default not admin
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    supabase_auth_id = EXCLUDED.supabase_auth_id;

  RETURN new;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a public.users record when a new auth.users record is created. Extracts username from metadata or email prefix.';
