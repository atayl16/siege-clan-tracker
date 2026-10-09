// Import Supabase with ES modules syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';
import { checkAuth, getCaller, unauthorizedResponse } from './_shared/auth.js';
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
    const caller = await getCaller(request, supabase);
    if (caller.error) return caller.error;
    const isAdmin = caller.role === 'admin';

    // user_goals_public_read lets the public see goals their owner marked
    // public. Members read their own private goals through supabase-js under
    // user_goals_own_rows, not through here. Admins see them all.
    let query = supabase.from('user_goals').select('*').order('id');
    if (!isAdmin) query = query.eq('public', true);

    const { data, error } = await query;
    if (error) throw error;

    return isAdmin
      ? jsonWithEtag(request, 'user-goals-admin', data, { isPrivate: true })
      : jsonWithEtag(request, 'user-goals', data, { cacheTag: 'supabase-user-goals' });
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
  path: '/api/user-goals',
};
