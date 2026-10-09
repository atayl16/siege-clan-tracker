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
    // Admin only. Migration 20260907000011 revoked anon access to
    // claim_requests; this endpoint was handing every row, admin_notes
    // included, to anyone who set an Origin header.
    const denied = await requireAdmin(request, supabase);
    if (denied) return denied;

    const { data, error } = await supabase
      .from('claim_requests')
      .select(
        'id, user_id, wom_id, rsn, message, status, admin_notes, ' +
          'admin_user_id, created_at'
      )
      .order('rsn');

    if (error) throw error;

    return jsonWithEtag(request, 'claim-requests', data, { isPrivate: true });
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
  path: '/api/claim-requests',
};
