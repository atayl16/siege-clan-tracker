// Import Supabase with ES modules syntax
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

export default async (request, _context) => {
  // Check authentication
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  // Get environment variables with Deno.env.get()
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Handle POST request to create a new race
  if (request.method === "POST") {
    try {
      const raceData = await request.json();

      // Validate required fields
      if (!raceData.creator_id || !raceData.title || !raceData.participants) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: creator_id, title, and participants" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate participants array
      if (!Array.isArray(raceData.participants) || raceData.participants.length === 0) {
        return new Response(
          JSON.stringify({ error: "participants must be a non-empty array" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate each participant has required fields
      for (const p of raceData.participants) {
        if (!p.wom_id || !p.player_name || !p.metric || p.target_value === undefined) {
          return new Response(
            JSON.stringify({
              error: "Each participant must have wom_id, player_name, metric, and target_value"
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Validate target_value is a positive number
        if (typeof p.target_value !== 'number' || p.target_value <= 0) {
          return new Response(
            JSON.stringify({ error: "target_value must be a positive number" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // TODO: Add creator_id authorization check
      // Currently, API key authentication doesn't provide user context.
      // Consider extracting user ID from JWT token or custom header to verify
      // that creator_id matches the authenticated user.

      // Insert the race
      const { data: race, error: raceError } = await supabase
        .from("races")
        .insert([
          {
            creator_id: raceData.creator_id,
            title: raceData.title,
            description: raceData.description || null,
            public: raceData.public || false,
            end_date: raceData.end_date || null,
          },
        ])
        .select()
        .single();

      if (raceError) throw raceError;

      // Insert race participants with atomic rollback on failure
      const participantsToInsert = raceData.participants.map((p) => ({
        race_id: race.id,
        wom_id: p.wom_id,
        player_name: p.player_name,
        metric: p.metric,
        target_value: p.target_value,
      }));

      const { error: participantsError } = await supabase
        .from("race_participants")
        .insert(participantsToInsert);

      // If participants insertion fails, rollback the race creation
      if (participantsError) {
        console.error("Failed to insert participants, rolling back race:", participantsError);

        // Delete the orphaned race
        await supabase
          .from("races")
          .delete()
          .eq("id", race.id);

        throw new Error(`Failed to create race: ${participantsError.message}`);
      }

      return new Response(JSON.stringify(race), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating race:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Handle GET request to fetch races
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

export const config = {
  path: "/api/races",
};
