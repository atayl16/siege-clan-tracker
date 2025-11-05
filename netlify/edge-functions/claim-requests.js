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

  console.log("Fetching claim request data from Supabase...");

  // Cache for 15 minutes (900 seconds)
  const TTL = 900;

  // Handle conditional requests
  const ifNoneMatch = request.headers.get("If-None-Match");
  const etag = `W/"claim-requests-${new Date().toISOString().split("T")[0]}"`;

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
      .from("claim_requests")
      .select("*") // Fetch all columns from the claim_requests table
      .order("rsn"); // Order by RSN

    if (error) throw error;

    // Return with caching headers and ETag
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${TTL}`,
        "CDN-Cache-Control": `public, max-age=${TTL}`,
        "Netlify-Cache-Tag": "supabase-claim-requests",
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
  path: "/api/claim-requests",
};
