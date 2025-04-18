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

// Main execution function
async function syncWomEvents() {
  try {
    console.log('🔄 Starting WOM Events sync...');
    
    // Log environment variables status (without revealing values)
    console.log('Environment check:');
    console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- WOM_API_KEY: ${process.env.WOM_API_KEY ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- WOM_GROUP_ID: ${process.env.WOM_GROUP_ID ? 'Set ✓' : 'Missing ❌'}`);
    
    // Fetch competitions for the group
    console.log(`Fetching competitions for WOM group ${WOM_GROUP_ID}`);
    const competitionsResponse = await fetch(`${WOM_API_BASE}/groups/${WOM_GROUP_ID}/competitions`, {
      headers: {
        'x-api-key': WOM_API_KEY
      }
    });
    
    if (!competitionsResponse.ok) {
      throw new Error(`Failed to fetch competitions: ${competitionsResponse.status}`);
    }
    
    const competitions = await competitionsResponse.json();
    console.log(`Found ${competitions.length} competitions`);
    
    // Calculate the one month ago date for filtering old events
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    console.log(`Skipping events completed before: ${oneMonthAgo.toISOString()}`);
    
    // Track stats for results
    let totalProcessed = 0;
    let skippedOld = 0;
    let skippedProcessed = 0;
    let updatedEvents = 0;
    let addedPoints = 0;
    
    // Store competitions in Supabase
    for (const comp of competitions) {
      // Check if this competition already exists in our database
      const { data: existingComp, error: checkError } = await supabase
        .from('events')
        .select('id, status, winner_username, points_processed, end_date')
        .eq('wom_id', comp.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found, which is fine
        console.error(`Error checking for existing competition ${comp.id}:`, checkError);
        continue;
      }
      
      // Determine status based on dates
      const now = new Date();
      const startDate = new Date(comp.startsAt);
      const endDate = new Date(comp.endsAt);
      
      let status = 'upcoming';
      if (now > endDate) {
        status = 'completed';
      } else if (now >= startDate) {
        status = 'active';
      }
      
      // Format the data for our events table
      const eventData = {
        name: comp.title,
        wom_id: comp.id,
        is_wom: true,
        type: comp.title.toLowerCase().includes('sotw') || comp.title.toLowerCase().includes('skill') 
          ? 'skilling' 
          : comp.title.toLowerCase().includes('botw') || comp.title.toLowerCase().includes('boss') 
            ? 'bossing'
            : comp.title.toLowerCase().includes('raid') 
              ? 'raids'
              : 'other',
        start_date: comp.startsAt,
        end_date: comp.endsAt,
        metric: comp.metric,
        status: status,
        description: `WOM Competition: ${comp.metric.replace(/_/g, ' ')}`
      };
      
      // If it's a completed competition and we don't have a winner yet, get the winner
      if (status === 'completed' && (!existingComp || !existingComp.winner_username)) {
        try {
          console.log(`Fetching winner for completed competition ${comp.id}: ${comp.title}`);
          
          // Fetch competition details to get participants
          const detailsResponse = await fetch(`${WOM_API_BASE}/competitions/${comp.id}`, {
            headers: {
              'x-api-key': WOM_API_KEY
            }
          });
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            
            // Get participants and sort by progress gained (highest first)
            const participants = detailsData.participations || [];
            participants.sort((a, b) => (b.progress?.gained || 0) - (a.progress?.gained || 0));
            
            // Extract winner info - just store display name or username
            const winner = participants.length > 0 ? participants[0] : null;
            
            if (winner && winner.player) {
              const winnerName = winner.player.displayName || winner.player.username;
              console.log(`Winner for "${comp.title}": ${winnerName} with ${winner.progress?.gained} gained`);
              
              // Add winner username to event data
              eventData.winner_username = winnerName;
            }
          } else {
            console.error(`Failed to fetch competition details: ${detailsResponse.status}`);
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
          .from('events')
          .update(eventData)
          .eq('id', existingComp.id);
        
        if (updateError) {
          console.error(`Error updating competition ${comp.id}:`, updateError);
        } else {
          updatedEvents++;
        }
      } else {
        // Insert new event
        const { error: insertError } = await supabase
          .from('events')
          .insert([eventData]);
        
        if (insertError) {
          console.error(`Error inserting competition ${comp.id}:`, insertError);
        } else {
          updatedEvents++;
        }
      }
      
      // If the competition is completed, check if we should process results
      if (status === 'completed') {
        // Check if points have already been processed
        const alreadyProcessed = existingComp && existingComp.points_processed === true;
        
        // Check if the event is over a month old
        const eventEndDate = new Date(comp.endsAt);
        const isTooOld = eventEndDate < oneMonthAgo;
        
        if (alreadyProcessed) {
          console.log(`Skipping points for competition ${comp.id} - already processed`);
          skippedProcessed++;
        } else if (isTooOld) {
          console.log(`Skipping points for competition ${comp.id} - over one month old (ended ${eventEndDate.toISOString()})`);
          skippedOld++;
          
          // Mark old competitions as processed so we don't check them again
          if (existingComp) {
            await supabase
              .from('events')
              .update({ points_processed: true, skipped_reason: 'too_old' })
              .eq('id', existingComp.id);
          }
        } else {
          console.log(`Processing points for competition ${comp.id}`);
          await processCompetitionResults(comp.id);
          addedPoints++;
        }
        
        totalProcessed++;
      }
    }
    
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
      skippedOld
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
      .from('events')
      .select('points_processed, processing_started_at')
      .eq('wom_id', competitionId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`Error checking competition ${competitionId} status:`, checkError);
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
      console.log(`Competition ${competitionId} appears to be in processing (started at ${processingStartedAt}). Skipping to avoid duplicate points.`);
      return;
    }
    
    // Mark competition as "processing" with timestamp to prevent concurrent processing
    const { error: markProcessingError } = await supabase
      .from('events')
      .update({ processing_started_at: currentTime })
      .eq('wom_id', competitionId);
      
    if (markProcessingError) {
      console.error(`Error marking competition ${competitionId} as processing:`, markProcessingError);
      return;
    }
    
    // Fetch competition details to get participants and results
    const compDetailsResponse = await fetch(`${WOM_API_BASE}/competitions/${competitionId}`, {
      headers: {
        'x-api-key': WOM_API_KEY
      }
    });
    
    if (!compDetailsResponse.ok) {
      throw new Error(`Failed to fetch competition details: ${compDetailsResponse.status}`);
    }
    
    const compDetails = await compDetailsResponse.json();
    const participants = compDetails.participations || [];
    
    if (!participants || participants.length === 0) {
      console.log(`No participants found for competition ${competitionId}`);
      
      // Mark as processed even if no participants
      await supabase
        .from('events')
        .update({ 
          status: 'completed',
          points_processed: true,
          processing_started_at: null,
          skipped_reason: 'no_participants'
        })
        .eq('wom_id', competitionId);
        
      return;
    }
    
    // Sort participants by their progress (gains)
    const validParticipants = participants
      .filter(p => p.progress?.gained > 0) // Only count those who participated (progress > 0)
      .sort((a, b) => (b.progress?.gained || 0) - (a.progress?.gained || 0));
    
    console.log(`Processing results for ${validParticipants.length} participants in competition ${competitionId}`);
    
    // Group participants by their progress to handle ties
    const progressGroups = [];
    let lastProgress = -1;
    
    for (const participant of validParticipants) {
      const progress = participant.progress?.gained || 0;
      
      // If this is the same progress as the previous participant, add to the same group
      if (progress === lastProgress && progressGroups.length > 0) {
        progressGroups[progressGroups.length - 1].participants.push(participant);
      } else {
        // Otherwise start a new group
        progressGroups.push({
          progress: progress,
          participants: [participant]
        });
      }
      
      lastProgress = progress;
    }
    
    // Calculate places and points based on the progressive groups
    let currentPlace = 1;
    const pointsData = [];
    const memberUpdates = [];
    
    for (const group of progressGroups) {
      // Determine points for this place
      let pointsToAward = 2; // Default participation points
      
      if (currentPlace === 1) {
        pointsToAward = 15; // First place
      } else if (currentPlace === 2) {
        pointsToAward = 10; // Second place
      } else if (currentPlace === 3) {
        pointsToAward = 5;  // Third place
      }
      
      console.log(`Place #${currentPlace}: ${group.participants.length} participants with progress ${group.progress} - awarding ${pointsToAward} points each`);
      
      // Process all participants in this tie group
      for (const participant of group.participants) {
        try {
          // Get the member from our database
          const username = participant.player.username.toLowerCase();
          const { data: members, error: memberQueryError } = await supabase
            .from('members')
            .select('wom_id, siege_score')
            .ilike('wom_name', username);
      
          if (memberQueryError) {
            console.error(`Error querying member ${username}:`, memberQueryError);
            continue;
          }
      
          // Define member outside of conditional blocks so it's available throughout
          let member;
          
          // Use the first match if any found
          if (!members || members.length === 0) {
            console.log(`Member not found: ${username} - will try alternative lookup`);
      
            // Try alternative lookup with display name
            const displayName = participant.player.displayName?.toLowerCase();
            if (displayName && displayName !== username) {
              const { data: altMembers } = await supabase
                .from('members')
                .select('wom_id, siege_score')
                .ilike('wom_name', displayName);
                
              if (altMembers && altMembers.length > 0) {
                console.log(`Found member via display name: ${displayName}`);
                member = altMembers[0];
              } else {
                console.error(`Member not found by username or display name: ${username}`);
                continue;
              }
            } else {
              console.error(`Member not found: ${username}`);
              continue;
            }
          } else {
            member = members[0];
          }
          
          // Only process if we found a valid member
          if (member) {
            // Store data for transaction
            const newScore = (member.siege_score || 0) + pointsToAward;
            memberUpdates.push({
              wom_id: member.wom_id,
              oldScore: member.siege_score || 0,
              newScore: newScore,
              pointsToAward: pointsToAward
            });
            
            // Store event result for transaction
            pointsData.push({
              event_id: competitionId,
              wom_id: member.wom_id,
              player_name: participant.player.username,
              placement: currentPlace, // Use the actual place, not index
              points_awarded: pointsToAward,
              progress: participant.progress.gained
            });
          }
        } catch (err) {
          console.error(`Error preparing data for ${participant.player.username}:`, err);
        }
      } // End of participant loop
      
      // Increment place counter for next group
      currentPlace++;
    } // End of progress groups loop
    
    // Now execute the transaction if we have members to award points to
    if (memberUpdates.length > 0) {
      console.log(`Executing transaction for ${memberUpdates.length} member point awards`);
      
      try {
        // Start a Supabase transaction (using functions to emulate a transaction)
        const { data: functionResult, error: functionError } = await supabase.rpc(
          "award_competition_points",
          {
            competition_id: competitionId,
            points_data: pointsData, // Pass as object, not string
            member_updates: memberUpdates // Pass as object, not string
          }
        );
        
        if (functionError) {
          throw new Error(`Transaction failed: ${functionError.message}`);
        }
        
        console.log(`Transaction completed successfully! Awarded points to ${memberUpdates.length} members`);
        
        // Log the awarded points for each member
        memberUpdates.forEach(update => {
          console.log(`Awarded ${update.pointsToAward} points to member ${update.wom_id} (${update.oldScore} → ${update.newScore})`);
        });
      } catch (transactionError) {
        console.error(`Transaction error for competition ${competitionId}:`, transactionError);
        
        // Reset processing flag since we failed
        await supabase
          .from('events')
          .update({ processing_started_at: null })
          .eq('wom_id', competitionId);
          
        throw transactionError;
      }
    } else {
      console.log(`No valid members to award points to in competition ${competitionId}`);
    }
    
    // Mark this competition as processed in our database
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        status: 'completed',
        points_processed: true,
        processing_started_at: null
      })
      .eq('wom_id', competitionId);
    
    if (updateError) {
      console.error(`Error updating competition status ${competitionId}:`, updateError);
    }
    
  } catch (err) {
    console.error(`Error processing competition results for ${competitionId}:`, err);
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
