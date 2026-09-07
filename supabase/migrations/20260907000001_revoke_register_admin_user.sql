-- Migration: Revoke register_admin_user() from authenticated
--
-- register_admin_user() is SECURITY DEFINER and was granted to `authenticated`.
-- Its body unconditionally does:
--
--   INSERT INTO users (id, username, password_hash, is_admin)
--   VALUES (auth.uid(), 'admin', '', true)
--   ON CONFLICT (id) DO UPDATE SET is_admin = true;
--
-- so any signed-in user could call it and make themselves an admin, which in
-- turn grants access to every /.netlify/functions/admin-* endpoint (those check
-- users.is_admin). Audited before writing this: production has 2 users and 1
-- admin, so there is no sign the path was ever used.
--
-- Revoking rather than dropping: the function is still the recovery route if the
-- admin's Supabase Auth account is ever recreated and its uid stops matching the
-- users row. Service role keeps EXECUTE, so it can be run deliberately from a
-- Netlify function or SQL console, but never from a browser session.
--
-- Safe for the current login flow: the admin's users row already has
-- supabase_auth_id set and is_admin = true, so the call is a no-op for them, and
-- AuthContext.jsx already ignores the result (it logs rpcError and continues).

REVOKE EXECUTE ON FUNCTION register_admin_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION register_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION register_admin_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION register_admin_user() TO service_role;

COMMENT ON FUNCTION register_admin_user() IS
  'Bootstrap/recovery only: links the current auth user to an admin users row. '
  'service_role only - granting this to authenticated allows any signed-in user '
  'to escalate to admin.';
