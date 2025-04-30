export default async (request, _context) => {
  // Use Deno.env.get() for environment variables
  const TTL = 600; // Cache for 10 minutes

  console.log("Fetching WOM player data...");
  
  try {
    // Extract player ID from URL or query params
    const url = new URL(request.url);
    const playerId = url.searchParams.get('id');
    
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: "Missing player ID" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch player data from WOM API
    const womResponse = await fetch(`https://api.wiseoldman.net/v2/players/${playerId}`, {
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
