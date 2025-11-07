import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Add debug logging
  console.log("Edge function: wom-group executing");

  // Get WOM Group ID from environment using Deno.env.get() instead of process.env
  const WOM_GROUP_ID = Deno.env.get("WOM_GROUP_ID") || '2928';
  console.log("WOM_GROUP_ID:", WOM_GROUP_ID);
  
  // Cache for 15 minutes (900 seconds)
  const TTL = 900;

  console.log("Fetching WOM group data...");
  
  try {
    // Fetch from WOM API
    console.log("Fetching from WOM API...");
    const womResponse = await fetch(`https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}?includeMemberships=true`, {
      headers: { 'User-Agent': 'Siege-Clan-Tracker/1.0' }
    });
    
    console.log("WOM response status:", womResponse.status);
    
    if (!womResponse.ok) {
      throw new Error(`WOM API returned status: ${womResponse.status}`);
    }
    
    const data = await womResponse.json();
    console.log("WOM data received successfully");
    
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
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch group data: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const config = {
  path: "/api/wom-group",
};
