// Import Supabase with ES modules syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';
import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
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
    // Public. Explicit columns: members also holds claim_code (which lets
    // whoever has it claim the account), claimed_by and admin notes, none of
    // which belong in a public payload. Hidden members are left out, as
    // allow_public_read_visible_members does for the anon role.
    const { data, error } = await supabase
      .from('members')
      .select(
        'wom_id, name, wom_name, womrole, player_type, join_date, ' +
          'first_xp, current_xp, current_lvl, ehb, siege_score, ' +
          'runewatch_whitelisted, runewatch_reported, created_at, updated_at'
      )
      .is('left_date', null)
      .or('hidden.is.null,hidden.eq.false')
      .order('name');

    if (error) throw error;

    return jsonWithEtag(request, 'members', data, { cacheTag: 'supabase-members' });
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
  path: '/api/members',
};
