import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Use Deno.env.get() for environment variables
  const TTL = 600; // Cache for 10 minutes

  console.log("Fetching WOM player data...");
  
  try {
    // Extract player ID from URL or query params
    const url = new URL(request.url);
    const playerId = url.searchParams.get('id');

    // Callers pass the numeric WOM id (members.wom_id). It must be digits
    // only: it goes into the upstream path, so anything else could reach a
    // different WOM endpoint through this proxy.
    if (!playerId || !/^\d+$/.test(playerId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid player ID" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // /players/id/:id looks a player up by numeric id. /players/:x (which
    // this used) looks up by *username*, so a numeric id 404'd every time
    // and the goal metric picker, player stats and goal sync all came back
    // empty. scripts/sync-tasks/sync-wom.cjs uses the same /players/id/ form.
    const womResponse = await fetch(`https://api.wiseoldman.net/v2/players/id/${playerId}`, {
      headers: { 'User-Agent': 'Siege-Clan-Tracker/1.0' }
    });
    
    if (!womResponse.ok) {
      return new Response(
        JSON.stringify({ error: `WOM API Error: ${womResponse.status}` }), 
        { 
          status: womResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await womResponse.json();
    
    // Return with caching headers
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${TTL}`,
        'CDN-Cache-Control': `public, max-age=${TTL}`,
        'Netlify-Cache-Tag': `wom-player-${playerId}`
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch player data: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const config = {
  path: "/api/wom-player",
};
