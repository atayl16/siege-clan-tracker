// Import Supabase with ES modules syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';
import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { jsonWithEtag } from './_shared/etag.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Get environment variables with Deno.env.get()
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('Fetching members data from Supabase...');

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .is('left_date', null) // Filter out members who have left
      .order('name');

    if (error) throw error;

    // The ETag is a hash of the payload, so a 304 means the data really is
    // unchanged. See _shared/etag.js for why the old date-based tag was wrong.
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
