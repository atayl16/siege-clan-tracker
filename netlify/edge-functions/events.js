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
    // Public: allow_public_read_events lets anyone read every event, and
    // events has no column that is not already shown on the events page.
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date');

    if (error) throw error;

    return jsonWithEtag(request, 'events', data, { cacheTag: 'supabase-events' });
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
  path: '/api/events',
};
