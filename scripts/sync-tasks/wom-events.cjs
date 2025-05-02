const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// WOM API configuration
const WOM_API_KEY = process.env.WOM_API_KEY;
const WOM_GROUP_ID = process.env.WOM_GROUP_ID;
const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

// Cache for API responses to reduce duplicate calls
const apiCache = new Map();

// Helper function to add delay with exponential backoff
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for API requests with retry logic
async function fetchWithRetry(url, options = {}, retries = 3, initialBackoff = 2000) {
  let lastError;
  let backoff = initialBackoff;
  
  // Check cache first
  const cacheKey = `${url}-${JSON.stringify(options.body || {})}`;
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }
  
  // Ensure headers include API key
  const headers = {
    ...options.headers,
    'x-api-key': WOM_API_KEY
  };
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 429) {
        console.log(`Rate limit hit on attempt ${attempt + 1}. Backing off for ${backoff}ms...`);
        await delay(backoff);
        // Exponential backoff
        backoff *= 2;
        continue;
      }
      
      if (response.ok) {
        const data = await response.json();
        // Store in cache
        apiCache.set(cacheKey, data);
        return data;
      } else {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
    } catch (err) {
      lastError = err;
      
      if (attempt < retries) {
        console.log(`Request failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${backoff}ms...`);
        await delay(backoff);
        // Exponential backoff
        backoff *= 2;
      }
    }
  }
  
  throw lastError || new Error('Request failed after multiple retries');
}

// Main execution function
async function syncWomEvents() {
  try {
    console.log("🔄 Starting WOM Events sync...");

    // Log environment variables status (without revealing values)
    console.log("Environment check:");
    console.log(
      `- SUPABASE_URL: ${process.env.SUPABASE_URL ? "Set ✓" : "Missing ❌"}`
    );
    console.log(
      `- SUPABASE_SERVICE_ROLE_KEY: ${
        process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set ✓" : "Missing ❌"
      }`
    );
    console.log(
      `- WOM_API_KEY: ${process.env.WOM_API_KEY ? "Set ✓" : "Missing ❌"}`
    );
    console.log(
      `- WOM_GROUP_ID: ${process.env.WOM_GROUP_ID ? "Set ✓" : "Missing ❌"}`
    );

    // OPTIMIZATION: Get last sync time to optimize processing
    const { data: syncInfo } = await supabase
      .from("sync_logs")
      .select("last_sync")
      .eq("type", "wom_events")
      .order("last_sync", { ascending: false })
      .limit(1)
      .single();
    
    const lastSyncTime = syncInfo?.last_sync || new Date(0).toISOString();
    console.log(`Last sync time: ${lastSyncTime}`);

    // Fetch competitions for the group
    console.log(`Fetching competitions for WOM group ${WOM_GROUP_ID}`);
    const competitions = await fetchWithRetry(
      `${WOM_API_BASE}/groups/${WOM_GROUP_ID}/competitions`
    );
    
    console.log(`Found ${competitions.length} competitions`);

    // Calculate the one month ago date for filtering old events
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Calculate one day ago for prioritization
    const oneDayAgo = new Date(Date.now() - 86400000);
    
    console.log(`Skipping events completed before: ${oneMonthAgo.toISOString()}`);

    // Filter out competitions that ended more than a month ago
    const recentCompetitions = competitions.filter((comp) => {
      const endDate = new Date(comp.endsAt);
      const isRecent = endDate >= oneMonthAgo;
      if (!isRecent) {
        console.log(
          `Skipping old competition: "${
            comp.title
          }" (ended ${endDate.toISOString()})`
        );
      }
      return isRecent;
    });

    console.log(
      `Processing ${recentCompetitions.length} of ${
        competitions.length
      } competitions (${
        competitions.length - recentCompetitions.length
      } old competitions filtered out)`
    );

    // OPTIMIZATION: Prioritize newly completed competitions
    // Sort competitions by priority:
    // 1. Newly completed in the last day
    // 2. Active competitions
    // 3. Upcoming competitions
    // 4. Older completed competitions
    
    const now = new Date();
    
    // Split competitions into categories
    const newlyCompleted = recentCompetitions.filter(comp => {
      const endDate = new Date(comp.endsAt);
      return endDate <= now && endDate >= oneDayAgo;
    });
    
    const activeCompetitions = recentCompetitions.filter(comp => {
      const startDate = new Date(comp.startsAt);
      const endDate = new Date(comp.endsAt);
      return now >= startDate && now <= endDate;
    });
    
    const upcomingCompetitions = recentCompetitions.filter(comp => {
      const startDate = new Date(comp.startsAt);
      return startDate > now;
    });
    
    const olderCompleted = recentCompetitions.filter(comp => {
      const endDate = new Date(comp.endsAt);
      return endDate < oneDayAgo && endDate >= oneMonthAgo;
    });
    
    console.log(`Competition categories:
    - Newly completed (last 24h): ${newlyCompleted.length}
    - Active competitions: ${activeCompetitions.length}
    - Upcoming competitions: ${upcomingCompetitions.length}
    - Older completed competitions: ${olderCompleted.length}`);

    // OPTIMIZATION: Use time-based processing to limit competitions per run
    const currentHour = new Date().getHours();
    const hourBasedLimit = 5; // Base limit of competitions to process per hour
    
    // Process different types in different hours
    let competitionsToProcess = [];
    
    // Always process newly completed first
    competitionsToProcess = [...newlyCompleted];
    
    // Then based on the hour, process different categories
    if (currentHour % 4 === 0) {
      // First quarter: Focus on active
      competitionsToProcess = [
        ...competitionsToProcess,
        ...activeCompetitions.slice(0, hourBasedLimit)
      ];
    } else if (currentHour % 4 === 1) {
      // Second quarter: Focus on upcoming
      competitionsToProcess = [
        ...competitionsToProcess,
        ...upcomingCompetitions.slice(0, hourBasedLimit)
      ];
    } else if (currentHour % 4 === 2 || currentHour % 4 === 3) {
      // Third/fourth quarter: Process older completed, but distributed
      // Use modulo to select different subset each hour
      const chunk = Math.floor(olderCompleted.length / 4);
      const startIdx = (currentHour % 4) * chunk;
      competitionsToProcess = [
        ...competitionsToProcess,
        ...olderCompleted.slice(startIdx, startIdx + hourBasedLimit)
      ];
    }
    
    // Make sure we don't process too many in one go
    const maxCompetitionsPerRun = 10;
    if (competitionsToProcess.length > maxCompetitionsPerRun) {
      console.log(`Limiting to ${maxCompetitionsPerRun} competitions for this run`);
      competitionsToProcess = competitionsToProcess.slice(0, maxCompetitionsPerRun);
    }
    
    console.log(`Processing ${competitionsToProcess.length} competitions in this run`);

    // Track stats for results
    let totalProcessed = 0;
    let skippedOld = competitions.length - recentCompetitions.length;
    let skippedProcessed = 0;
    let updatedEvents = 0;
    let addedPoints = 0;

    // Prefetch existing competitions in one batch query for efficiency
    const womIds = competitionsToProcess.map(comp => comp.id);
    
    const { data: existingComps, error: batchFetchError } = await supabase
      .from("events")
      .select("id, wom_id, status, winner_username, points_processed, end_date")
      .in("wom_id", womIds);
    
    if (batchFetchError) {
      console.error("Error batch fetching competitions:", batchFetchError);
    }
    
    // Create lookup map for quick access
    const existingCompMap = new Map();
    if (existingComps) {
      existingComps.forEach(comp => {
        existingCompMap.set(comp.wom_id, comp);
      });
    }

    // OPTIMIZATION: Process competitions in parallel batches
    const batchSize = 3; // Process 3 at a time
    
    for (let i = 0; i < competitionsToProcess.length; i += batchSize) {
      const batch = competitionsToProcess.slice(i, i + batchSize);
      
      // Process this batch in parallel
      await Promise.all(batch.map(async (comp) => {
        try {
          // Get existing comp from our map
          const existingComp = existingCompMap.get(comp.id);
          
          // Determine status based on dates
          const now = new Date();
          const startDate = new Date(comp.startsAt);
          const endDate = new Date(comp.endsAt);

          let status = "upcoming";
          if (now > endDate) {
            status = "completed";
          } else if (now >= startDate) {
            status = "active";
          }

          // Format the data for our events table
          const eventData = {
            name: comp.title,
            wom_id: comp.id,
            is_wom: true,
            type:
              comp.title.toLowerCase().includes("sotw") ||
              comp.title.toLowerCase().includes("skill")
                ? "skilling"
                : comp.title.toLowerCase().includes("botw") ||
                  comp.title.toLowerCase().includes("boss")
                ? "bossing"
                : comp.title.toLowerCase().includes("raid")
                ? "raids"
                : "other",
            start_date: comp.startsAt,
            end_date: comp.endsAt,
            metric: comp.metric,
            status: status,
            description: `WOM Competition: ${comp.metric.replace(/_/g, " ")}`,
          };

          // If it's a completed competition and we don't have a winner yet, get the winner
          if (
            status === "completed" &&
            (!existingComp || !existingComp.winner_username)
          ) {
            try {
              console.log(
                `Fetching winner for completed competition ${comp.id}: ${comp.title}`
              );

              // Fetch competition details to get participants
              const detailsData = await fetchWithRetry(
                `${WOM_API_BASE}/competitions/${comp.id}`
              );

              // Get participants and sort by progress gained (highest first)
              const participants = detailsData.participations || [];
              participants.sort(
                (a, b) => (b.progress?.gained || 0) - (a.progress?.gained || 0)
              );

              // Extract winner info - just store display name or username
              const winner = participants.length > 0 ? participants[0] : null;

              if (winner && winner.player) {
                const winnerName =
                  winner.player.displayName || winner.player.username;
                console.log(
                  `Winner for "${comp.title}": ${winnerName} with ${winner.progress?.gained} gained`
                );

                // Add winner username to event data
                eventData.winner_username = winnerName;
              }
            } catch (err) {
              console.error(`Error fetching competition winner: ${err}`);
            }
          } else if (existingComp && existingComp.winner_username) {
            // Keep existing winner information
            eventData.winner_username = existingComp.winner_username;
          }

          if (existingComp) {
            // Update existing event
            const { error: updateError } = await supabase
              .from("events")
              .update(eventData)
              .eq("id", existingComp.id);

            if (updateError) {
              console.error(`Error updating competition ${comp.id}:`, updateError);
            } else {
              updatedEvents++;
            }
          } else {
            // Insert new event
            const { error: insertError } = await supabase
              .from("events")
              .insert([eventData]);

            if (insertError) {
              console.error(`Error inserting competition ${comp.id}:`, insertError);
            } else {
              updatedEvents++;
            }
          }

          // If the competition is completed, check if we should process results
          if (status === "completed") {
            // Check if points have already been processed
            const alreadyProcessed =
              existingComp && existingComp.points_processed === true;

            // Check if the event is over a month old
            const eventEndDate = new Date(comp.endsAt);
            const isTooOld = eventEndDate < oneMonthAgo;

            if (alreadyProcessed) {
              console.log(
                `Skipping points for competition ${comp.id} - already processed`
              );
              skippedProcessed++;
            } else if (isTooOld) {
              console.log(
                `Skipping points for competition ${
                  comp.id
                } - over one month old (ended ${eventEndDate.toISOString()})`
              );
              skippedOld++;

              // Mark old competitions as processed so we don't check them again
              if (existingComp) {
                await supabase
                  .from("events")
                  .update({ points_processed: true, skipped_reason: "too_old" })
                  .eq("id", existingComp.id);
              }
            } else {
              console.log(`Processing points for competition ${comp.id}`);
              await processCompetitionResults(comp.id);
              addedPoints++;
            }

            totalProcessed++;
          }
        } catch (err) {
          console.error(`Error processing competition ${comp.id}:`, err);
        }
      }));
      
      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < competitionsToProcess.length) {
        await delay(1000);
      }
    }

    // Update the sync log with current time
    await supabase
      .from("sync_logs")
      .upsert({
        type: "wom_events",
        last_sync: new Date().toISOString(),
        details: JSON.stringify({
          totalProcessed,
          updatedEvents,
          addedPoints,
          skippedProcessed,
          skippedOld
        })
      });

    console.log(`Events processing summary:
    - Total completed competitions: ${totalProcessed}
    - Updated events: ${updatedEvents}
    - Awarded points: ${addedPoints}
    - Skipped (already processed): ${skippedProcessed}
    - Skipped (over one month old): ${skippedOld}`);

    return {
      totalProcessed,
      updatedEvents,
      addedPoints,
      skippedProcessed,
      skippedOld,
    };
  } catch (err) {
    console.error('❌ Error in WOM events sync:', err);
    // Exit with error code for GitHub Actions
    process.exit(1);
  }
}

// Process competition results and award points
async function processCompetitionResults(competitionId) {
  try {
    // First check if we've already processed points for this competition
    const { data: existingEvent, error: checkError } = await supabase
      .from("events")
      .select("id, points_processed, processing_started_at")
      .eq("wom_id", competitionId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error(
        `Error checking competition ${competitionId} status:`,
        checkError
      );
      return;
    }

    // Store the actual UUID of the event
    const eventUuid = existingEvent?.id;
    if (!eventUuid) {
      console.error(`Cannot find event UUID for competition ${competitionId}`);
      return;
    }

    // Skip if already processed
    if (existingEvent && existingEvent.points_processed === true) {
      console.log(`Points already processed for competition ${competitionId}`);
      return;
    }

    // Check if processing started but didn't complete (potential previous failure)
    const processingStartedAt = existingEvent?.processing_started_at;
    const currentTime = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

    if (processingStartedAt && processingStartedAt > oneHourAgo) {
      console.log(
        `Competition ${competitionId} appears to be in processing (started at ${processingStartedAt}). Skipping to avoid duplicate points.`
      );
      return;
    }

    // Mark competition as "processing" with timestamp to prevent concurrent processing
    const { error: markProcessingError } = await supabase
      .from("events")
      .update({ processing_started_at: currentTime })
      .eq("wom_id", competitionId);

    if (markProcessingError) {
      console.error(
        `Error marking competition ${competitionId} as processing:`,
        markProcessingError
      );
      return;
    }

    // Fetch competition details to get participants and results
    const compDetails = await fetchWithRetry(
      `${WOM_API_BASE}/competitions/${competitionId}`
    );
    
    const participants = compDetails.participations || [];

    if (!participants || participants.length === 0) {
      console.log(`No participants found for competition ${competitionId}`);

      // Mark as processed even if no participants
      await supabase
        .from("events")
        .update({
          status: "completed",
          points_processed: true,
          processing_started_at: null,
          skipped_reason: "no_participants",
        })
        .eq("wom_id", competitionId);

      return;
    }

    // Sort participants by their progress (gains)
    const validParticipants = participants
      .filter((p) => p.progress?.gained > 0) // Only count those who participated (progress > 0)
      .sort((a, b) => (b.progress?.gained || 0) - (a.progress?.gained || 0));

    console.log(
      `Processing results for ${validParticipants.length} participants in competition ${competitionId}`
    );

    // Group participants by their progress to handle ties
    const progressGroups = [];
    let lastProgress = -1;

    for (const participant of validParticipants) {
      const progress = participant.progress?.gained || 0;

      // If this is the same progress as the previous participant, add to the same group
      if (progress === lastProgress && progressGroups.length > 0) {
        progressGroups[progressGroups.length - 1].participants.push(
          participant
        );
      } else {
        // Otherwise start a new group
        progressGroups.push({
          progress: progress,
          participants: [participant],
        });
      }

      lastProgress = progress;
    }

    // Calculate places and points based on the progressive groups
    let currentPlace = 1;
    const pointsData = [];
    const memberUpdates = [];

    // OPTIMIZATION: Gather all usernames first to minimize database queries
    const allUsernames = validParticipants.map(p => 
      p.player.username.toLowerCase()
    );
    
    const allDisplayNames = validParticipants
      .filter(p => p.player.displayName)
      .map(p => p.player.displayName.toLowerCase());
    
    // Get all members matching these usernames in one query
    const { data: memberMatches } = await supabase
      .from("members")
      .select("wom_id, wom_name, siege_score")
      .or(`wom_name.in.(${allUsernames.map(u => `"${u}"`).join(',')}),wom_name.in.(${allDisplayNames.map(d => `"${d}"`).join(',')})`);
    
    // Create a map for quick lookups
    const memberMap = new Map();
    if (memberMatches) {
      memberMatches.forEach(member => {
        memberMap.set(member.wom_name.toLowerCase(), member);
      });
    }

    for (const group of progressGroups) {
      // Determine points for this place
      let pointsToAward = 2; // Default participation points

      if (currentPlace === 1) {
        pointsToAward = 15; // First place
      } else if (currentPlace === 2) {
        pointsToAward = 10; // Second place
      } else if (currentPlace === 3) {
        pointsToAward = 5; // Third place
      }

      console.log(
        `Place #${currentPlace}: ${group.participants.length} participants with progress ${group.progress} - awarding ${pointsToAward} points each`
      );

      // Process all participants in this tie group
      for (const participant of group.participants) {
        try {
          // Try to find the member using our pre-loaded map
          const username = participant.player.username.toLowerCase();
          const displayName = participant.player.displayName?.toLowerCase();
          
          let member = memberMap.get(username);
          
          // Try display name if username didn't match
          if (!member && displayName && displayName !== username) {
            member = memberMap.get(displayName);
          }

          // Only process if we found a valid member
          if (member) {
            // Store data for transaction
            const newScore = (member.siege_score || 0) + pointsToAward;
            memberUpdates.push({
              wom_id: member.wom_id,
              oldScore: member.siege_score || 0,
              newScore: newScore,
              pointsToAward: pointsToAward,
            });

            // Store event result for transaction
            pointsData.push({
              event_id: eventUuid,
              wom_id: member.wom_id,
              player_name: participant.player.username,
              placement: currentPlace, // Use the actual place, not index
              points_awarded: pointsToAward,
              progress: participant.progress.gained,
            });
          } else {
            console.log(
              `Member not found for player: ${participant.player.username}`
            );
          }
        } catch (err) {
          console.error(
            `Error preparing data for ${participant.player.username}:`,
            err
          );
        }
      } // End of participant loop

      // Increment place counter for next group
      currentPlace++;
    } // End of progress groups loop

    // Now execute the transaction if we have members to award points to
    if (memberUpdates.length > 0) {
      console.log(
        `Executing transaction for ${memberUpdates.length} member point awards`
      );

      try {
        // Start a Supabase transaction (using functions to emulate a transaction)
        const { data: functionResult, error: functionError } =
          await supabase.rpc("award_competition_points", {
            competition_id: competitionId,
            points_data: pointsData, // Pass as object, not string
            member_updates: memberUpdates, // Pass as object, not string
          });

        if (functionError) {
          throw new Error(`Transaction failed: ${functionError.message}`);
        }

        console.log(
          `Transaction completed successfully! Awarded points to ${memberUpdates.length} members`
        );

        // Log the awarded points for each member
        memberUpdates.forEach((update) => {
          console.log(
            `Awarded ${update.pointsToAward} points to member ${update.wom_id} (${update.oldScore} → ${update.newScore})`
          );
        });
      } catch (transactionError) {
        console.error(
          `Transaction error for competition ${competitionId}:`,
          transactionError
        );

        // Reset processing flag since we failed
        await supabase
          .from("events")
          .update({ processing_started_at: null })
          .eq("wom_id", competitionId);

        throw transactionError;
      }
    } else {
      console.log(
        `No valid members to award points to in competition ${competitionId}`
      );
    }

    // Mark this competition as processed in our database
    const { error: updateError } = await supabase
      .from("events")
      .update({
        status: "completed",
        points_processed: true,
        processing_started_at: null,
      })
      .eq("wom_id", competitionId);

    if (updateError) {
      console.error(
        `Error updating competition status ${competitionId}:`,
        updateError
      );
    }
  } catch (err) {
    console.error(
      `Error processing competition results for ${competitionId}:`,
      err
    );
    throw err;
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting WOM Events sync as standalone script');
  syncWomEvents()
    .then(results => {
      console.log('✅ WOM Events sync completed successfully', results);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ WOM Events sync failed:', err);
      process.exit(1);
    });
}

// Export the function for potential reuse in other scripts
module.exports = { syncWomEvents };
