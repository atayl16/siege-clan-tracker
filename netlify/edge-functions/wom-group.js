export default async (_request, _context) => {
  // Get WOM Group ID from environment using Deno.env.get() instead of process.env
  const WOM_GROUP_ID = Deno.env.get("WOM_GROUP_ID") || '2928'; // Default from your code
  
  // Cache for 15 minutes (900 seconds)
  const TTL = 900;
  
  try {
    // Fetch from WOM API
    const womResponse = await fetch(`https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}?includeMemberships=true`, {
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
        'Netlify-Cache-Tag': `wom-group-${WOM_GROUP_ID}`
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch group data: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
