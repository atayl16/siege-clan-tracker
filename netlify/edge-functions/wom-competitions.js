export default async (_request, _context) => {
  // Get WOM Group ID from environment using Deno.env.get()
  const WOM_GROUP_ID = Deno.env.get("WOM_GROUP_ID") || '2928'; // Default from your code
  
  // Cache for 30 minutes (1800 seconds)
  const TTL = 1800;

  console.log("Fetching WOM competitions data...");
  
  try {
    // Fetch from WOM API
    const womResponse = await fetch(`https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}/competitions`, {
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
        'Netlify-Cache-Tag': `wom-competitions-${WOM_GROUP_ID}`
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch competition data: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
