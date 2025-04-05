const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Get environment variables with fallbacks between prefixed and non-prefixed versions
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const womApiKey = process.env.WOM_API_KEY || process.env.REACT_APP_WOM_API_KEY;
const womGroupId = process.env.WOM_GROUP_ID || process.env.REACT_APP_WOM_GROUP_ID;

// Debug information
console.log("Environment variables check:");
console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
console.log("REACT_APP_SUPABASE_URL exists:", !!process.env.REACT_APP_SUPABASE_URL);
console.log("WOM_API_KEY exists:", !!process.env.WOM_API_KEY);
console.log("REACT_APP_WOM_API_KEY exists:", !!process.env.REACT_APP_WOM_API_KEY);
console.log("Using values:", !!supabaseUrl, !!supabaseKey, !!womApiKey, !!womGroupId);

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// WOM API base URL
const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

// Check if running as a Netlify function or directly
const isNetlifyFunction = !!process.env.NETLIFY;

// Main logic - either as a Netlify function handler or direct script
const syncGroup = async (event) => {
  // Headers for response (used in Netlify function context)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Request group update
    console.log(`Requesting update for WOM group ${womGroupId}`);
    const updateResponse = await fetch(`${WOM_API_BASE}/groups/${womGroupId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': womApiKey
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
    
    // Rest of your existing code...
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
    
    // Step 3: Fetch updated group data
    console.log('Fetching updated group data...');
    const groupResponse = await fetch(`${WOM_API_BASE}/groups/${womGroupId}?includeMemberships=true`);
    
    if (!groupResponse.ok) {
      throw new Error(`Failed to fetch group data: ${groupResponse.status}`);
    }
    
    const groupData = await groupResponse.json();
    const { members } = groupData;
    
    // Step 4: Fetch details for each player
    console.log(`Updating ${members.length} members in database...`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let memberPromises = [];
    
    for (const member of members) {
      memberPromises.push((async () => {
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
          const { error } = await supabase
            .from('members')
            .upsert({
              wom_id: member.id,
              name: member.displayName || member.username,
              wom_name: member.displayName,
              current_lvl: playerData.latestSnapshot?.data?.skills?.overall?.level || null,
              current_xp: playerData.latestSnapshot?.data?.skills?.overall?.experience || null,
              ehb: playerData.latestSnapshot?.data?.computed?.ehb || null,
              womrole: member.role || null
            }, { 
              onConflict: 'wom_id',
              ignoreDuplicates: false 
            });
          
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
      })());
      
      // Process in batches of 5 to avoid overwhelming the API
      if (memberPromises.length >= 5) {
        await Promise.all(memberPromises);
        memberPromises = [];
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Process any remaining members
    if (memberPromises.length > 0) {
      await Promise.all(memberPromises);
    }
    
    const result = {
      message: 'Group sync completed',
      stats: {
        total: members.length,
        updated: updatedCount,
        errors: errorCount
      }
    };
    
    // Return appropriate response based on context
    if (isNetlifyFunction) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    } else {
      console.log(result);
      return result;
    }
    
  } catch (err) {
    console.error('Error in sync operation:', err);
    
    const errorResult = {
      error: 'Failed to sync with WOM',
      message: err.message
    };
    
    if (isNetlifyFunction) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(errorResult)
      };
    } else {
      console.error(errorResult);
      throw err; // Re-throw for script context
    }
  }
};

// Export as a Netlify function handler
exports.handler = async (event, context) => {
  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Preflight call successful' }),
    };
  }
  
  return syncGroup(event);
};

// If running directly (not as a Netlify function), execute the sync
if (!isNetlifyFunction && require.main === module) {
  syncGroup()
    .then(() => {
      console.log('Sync completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}
