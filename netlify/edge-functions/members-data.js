// Import Supabase with ES modules syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export default async (request, _context) => {
  // Get environment variables with Deno.env.get()
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const API_ACCESS_KEY = Deno.env.get("API_ACCESS_KEY");
  
  console.log("Fetching members data from Supabase...");

  // Cache for 5 minutes (300 seconds)
  const TTL = 300;
  
  // Check for API key in headers for protection (optional)
  const apiKey = request.headers.get('x-api-key');
  if (API_ACCESS_KEY && apiKey !== API_ACCESS_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Handle conditional requests
  const ifNoneMatch = request.headers.get('If-None-Match');
  const etag = `W/"members-${new Date().toISOString().split('T')[0]}"`;
  
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': `public, max-age=${TTL}`,
        'CDN-Cache-Control': `public, max-age=${TTL}`,
      }
    });
  }
  
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get only necessary fields instead of '*'
    const { data, error } = await supabase
      .from('members')
      .select('wom_id, name, wom_name, current_lvl, current_xp, siege_score, active, runewatch_reported, runewatch_whitelisted')
      .eq('active', true) // Only get active members
      .order('name');
    
    if (error) throw error;
    
    // Return with caching headers and ETag
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${TTL}`,
        'CDN-Cache-Control': `public, max-age=${TTL}`,
        'Netlify-Cache-Tag': 'supabase-members',
        'ETag': etag
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
