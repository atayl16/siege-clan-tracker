import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Get environment variables using Deno.env.get
  const WOM_GROUP_ID = Deno.env.get("WOM_GROUP_ID") || '2928'; // Default group ID
  const WOM_API_KEY = Deno.env.get("WOM_API_KEY");
  
  // Cache for 10 minutes (600 seconds)
  const TTL = 600;

  console.log(`Fetching achievements for group ID: ${WOM_GROUP_ID}`);

  try {
    const response = await fetch(
      `https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}/achievements`,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Siege-Clan-Tracker/1.0",
          ...(WOM_API_KEY ? { "Authorization": `Bearer ${WOM_API_KEY}` } : {})
        },
      }
    );

    console.log("API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch achievements: ${errorText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Achievements data fetched successfully");

    // Return with caching headers
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
        "Netlify-Cache-Tag": `group-achievements-${WOM_GROUP_ID}`,
      },
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return new Response(
      JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/api/wom-group-achievements",
};
