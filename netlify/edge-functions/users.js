// Import Supabase with ES modules syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';
import { checkAuth, requireAdmin, unauthorizedResponse } from './_shared/auth.js';
import { jsonWithEtag } from './_shared/etag.js';

export default async (request, _context) => {
  // Blocks casual cross-origin use. Not authentication: Origin is client-set.
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Service role bypasses RLS, so every query below has to apply the same
  // limits RLS would.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  try {
    // Admin only: the account list for AdminUserManager. Login does not use
    // this endpoint - AuthContext reads the users table directly.
    const denied = await requireAdmin(request, supabase);
    if (denied) return denied;

    // Never password_hash. These are the columns UserSelector renders.
    const { data, error } = await supabase
      .from('users')
      .select('id, username, is_admin, created_at')
      .order('username');

    if (error) throw error;

    return jsonWithEtag(request, 'users', data, { isPrivate: true });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const config = {
  path: '/api/users',
};
