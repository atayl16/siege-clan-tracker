// Import Supabase with ES modules syntax
import { createClient } from "https://esm.sh/@supabase/supabase-js";

export default async (request, _context) => {
  // Get environment variables with Deno.env.get()
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log("Fetching races data from Supabase...");

  // Cache for 5 minutes
  const TTL = 3000;

  // Handle conditional requests
  const ifNoneMatch = request.headers.get("If-None-Match");
  const etag = `W/"races-${new Date().toISOString().split("T")[0]}"`;

  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get only necessary fields instead of '*'
    const { data, error } = await supabase
      .from("races")
      .select("*") // Fetch all columns from the members table
      .order("created_at"); // Order by name

    if (error) throw error;

    // Return with caching headers and ETag
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
        "Netlify-Cache-Tag": "supabase-members",
        ETag: etag,
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
