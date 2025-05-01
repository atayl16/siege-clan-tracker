export default async (req) => {
  console.log("Edge function: group-achievements executing");

  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || 10;
  const offset = url.searchParams.get("offset") || 0;

  // Get environment variables using Deno.env.get
  const WOM_GROUP_ID = Deno.env.get("WOM_GROUP_ID");
  const WOM_API_KEY = Deno.env.get("WOM_API_KEY");

  if (!WOM_GROUP_ID || !WOM_API_KEY) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`Fetching achievements for group ID: ${WOM_GROUP_ID} with limit=${limit} and offset=${offset}`);

  try {
    const response = await fetch(
      `https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}/achievements?limit=${limit}&offset=${offset}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WOM_API_KEY}`,
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
        "Cache-Control": "public, max-age=300",
        "CDN-Cache-Control": "public, max-age=300",
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
  path: "/api/group-achievements",
};
