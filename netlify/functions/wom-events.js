const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// WOM API configuration
const WOM_API_KEY = process.env.REACT_APP_WOM_API_KEY;
const WOM_GROUP_ID = process.env.REACT_APP_WOM_GROUP_ID;
const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' }),
    };
  }
  
  try {
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
    
    // Store competitions in Supabase
    for (const comp of competitions) {
      // Check if this competition already exists in our database
      const { data: existingComp, error: checkError } = await supabase
        .from('events')
        .select('id, status, winner_username')
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
        }
      } else {
        // Insert new event
        const { error: insertError } = await supabase
          .from('events')
          .insert([eventData]);
        
        if (insertError) {
          console.error(`Error inserting competition ${comp.id}:`, insertError);
        }
      }
      
      // If the competition is completed, process the results
      if (status === 'completed' && (!existingComp || existingComp.status !== 'completed')) {
        await processCompetitionResults(comp.id);
      }
    }
    
    // Return the current list of events
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (fetchError) throw fetchError;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(events || [])
    };
    
  } catch (err) {
    console.error('Error in wom-events function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process WOM events',
        message: err.message
      })
    };
  }
};

// Update processCompetitionResults function to also set the winner username
async function processCompetitionResults(competitionId) {
  try {
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
      return;
    }
    
    // Sort participants by their progress (gains)
    const validParticipants = participants
      .filter(p => p.progress?.gained > 0) // Only count those who participated (progress > 0)
      .sort((a, b) => (b.progress?.gained || 0) - (a.progress?.gained || 0));
    
    console.log(`Processing results for ${validParticipants.length} participants in competition ${competitionId}`);
    
    // Update the competition with winner information
    if (validParticipants.length > 0) {
      const winner = validParticipants[0];
      if (winner && winner.player) {
        const winnerName = winner.player.displayName || winner.player.username;
        console.log(`Setting winner for competition ${competitionId}: ${winnerName}`);
        
        // Update the event with the winner's username
        const { error: updateWinnerError } = await supabase
          .from('events')
          .update({ winner_username: winnerName })
          .eq('wom_id', competitionId);
          
        if (updateWinnerError) {
          console.error(`Error updating winner for competition ${competitionId}:`, updateWinnerError);
        }
      }
    }
    
    // Award points based on placement
    for (let i = 0; i < validParticipants.length; i++) {
      const participant = validParticipants[i];
      let pointsToAward = 2; // Default points for participation
      
      // Award bonus points for top 3 places
      if (i === 0) pointsToAward = 15; // 1st place
      else if (i === 1) pointsToAward = 10; // 2nd place
      else if (i === 2) pointsToAward = 5; // 3rd place
      
      // Get the member from our database
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('wom_id, siege_score')
        .eq('wom_name', participant.player.username)
        .single();
      
      if (memberError) {
        console.error(`Error finding member ${participant.player.username}:`, memberError);
        continue;
      }
      
      // Update the member's siege score
      const newScore = (member.siege_score || 0) + pointsToAward;
      const { error: updateError } = await supabase
        .from('members')
        .update({ siege_score: newScore })
        .eq('wom_id', member.wom_id);
      
      if (updateError) {
        console.error(`Error updating score for ${participant.player.username}:`, updateError);
      } else {
        console.log(`Awarded ${pointsToAward} points to ${participant.player.username}`);
      }
      
      // Record this point award in the event_results table
      const { error: resultError } = await supabase
        .from('event_results')
        .insert([{
          event_id: competitionId,
          wom_id: member.wom_id,
          player_name: participant.player.username,
          placement: i + 1,
          points_awarded: pointsToAward,
          progress: participant.progress.gained
        }]);
      
      if (resultError) {
        console.error(`Error recording result for ${participant.player.username}:`, resultError);
      }
    }
    
    // Mark this competition as processed in our database
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        status: 'completed',
        points_processed: true 
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
