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
    // Step 1: Request group update
    console.log(`Requesting update for WOM group ${WOM_GROUP_ID}`);
    const updateResponse = await fetch(`${WOM_API_BASE}/groups/${WOM_GROUP_ID}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WOM_API_KEY
      }
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Failed to request group update: ${errorData.message || updateResponse.status}`);
    }
    
    const updateData = await updateResponse.json();
    const jobId = updateData.job?.id;
    
    if (!jobId) {
      throw new Error('No job ID returned from update request');
    }
    
    // Step 2: Poll for job completion
    console.log(`Waiting for job ${jobId} to complete...`);
    
    // Poll for a maximum of 5 minutes (30 attempts, 10 seconds apart)
    let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!jobComplete && attempts < maxAttempts) {
      attempts++;
      
      const jobResponse = await fetch(`${WOM_API_BASE}/jobs/${jobId}`);
      
      if (!jobResponse.ok) {
        throw new Error(`Failed to check job status: ${jobResponse.status}`);
      }
      
      const jobData = await jobResponse.json();
      
      if (jobData.status === 'completed') {
        jobComplete = true;
        console.log('Job completed successfully');
      } else if (jobData.status === 'failed') {
        throw new Error(`Job failed: ${jobData.error || 'Unknown error'}`);
      } else {
        // Wait 10 seconds before checking again
        if (attempts < maxAttempts) {
          console.log(`Job in progress (${jobData.status}), waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    if (!jobComplete) {
      throw new Error('Job timed out after 5 minutes');
    }
    
    // Step 3: Fetch updated group data and update database
    console.log('Fetching updated group data...');
    const groupResponse = await fetch(`${WOM_API_BASE}/groups/${WOM_GROUP_ID}?includeMemberships=true`);
    
    if (!groupResponse.ok) {
      throw new Error(`Failed to fetch group data: ${groupResponse.status}`);
    }
    
    const groupData = await groupResponse.json();
    const { members } = groupData;
    
    console.log(`Updating ${members.length} members in database...`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process members in batches to avoid overwhelming the API
    for (let i = 0; i < members.length; i += 5) {
      const batch = members.slice(i, i + 5);
      
      await Promise.all(batch.map(async (member) => {
        try {
          // Fetch detailed player data
          const playerResponse = await fetch(`${WOM_API_BASE}/players/${member.username}`);
          
          if (!playerResponse.ok) {
            console.error(`Error fetching player ${member.username}: ${playerResponse.status}`);
            errorCount++;
            return;
          }
          
          const playerData = await playerResponse.json();
          
          // Update the member in Supabase
          const { error } = await supabase.from("members").upsert(
            {
              wom_id: member.id,
              name: member.displayName || member.username,
              wom_name: member.displayName,
              current_lvl:
                playerData.latestSnapshot?.data?.skills?.overall?.level || null,
              current_xp:
                playerData.latestSnapshot?.data?.skills?.overall?.experience ||
                null,
              ehb: Math.round(
                playerData.latestSnapshot?.data?.computed?.ehb?.value || 0
              ),
              womrole: member.role || null,
            },
            {
              onConflict: "wom_id",
              ignoreDuplicates: false,
            }
          );
          
          if (error) {
            console.error(`Error updating member ${member.username}:`, error);
            errorCount++;
          } else {
            updatedCount++;
          }
        } catch (err) {
          console.error(`Exception processing member ${member.username}:`, err);
          errorCount++;
        }
      }));
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Group sync completed',
        stats: {
          total: members.length,
          updated: updatedCount,
          errors: errorCount
        }
      })
    };
    
  } catch (err) {
    console.error('Error in sync-wom function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to sync with WOM',
        message: err.message
      })
    };
  }
};
