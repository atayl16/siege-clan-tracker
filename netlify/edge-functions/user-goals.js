// Import Supabase with ES modules syntax
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { validateApiKey, unauthorizedResponse, getCorsHeaders } from './_shared/auth.js';

export default async (request, _context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders()
    });
  }

  // Validate API key
  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    return unauthorizedResponse();
  }

  // Get environment variables with Deno.env.get()
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log("Fetching user-goal data from Supabase...");

  // Cache for 5 minutes (300 seconds)
  const TTL = 300;

  // Handle conditional requests
  const ifNoneMatch = request.headers.get("If-None-Match");
  const etag = `W/"user-goals-${new Date().toISOString().split("T")[0]}"`;

  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
        ...getCorsHeaders()
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get only necessary fields instead of '*'
    const { data, error } = await supabase
      .from("user_goals")
      .select("*") // Fetch all columns from the user_goals table
      .order("id"); // Order by ID

    if (error) throw error;

    // Return with caching headers and ETag
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
        "Netlify-Cache-Tag": "supabase-user-goals",
        ETag: etag,
        ...getCorsHeaders()
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders()
      },
    });
  }
};

export const config = {
  path: "/api/user-goals",
};
