const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Get environment variables with fallbacks between prefixed and non-prefixed versions
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const womApiKey = process.env.WOM_API_KEY || process.env.REACT_APP_WOM_API_KEY;
const womGroupId = process.env.WOM_GROUP_ID || process.env.REACT_APP_WOM_GROUP_ID;
const womVerificationCode = process.env.WOM_VERIFICATION_CODE || process.env.REACT_APP_WOM_VERIFICATION_CODE;

// Debug information
console.log("Environment variables check:");
console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
console.log("REACT_APP_SUPABASE_URL exists:", !!process.env.REACT_APP_SUPABASE_URL);
console.log("WOM_API_KEY exists:", !!process.env.WOM_API_KEY);
console.log("REACT_APP_WOM_API_KEY exists:", !!process.env.REACT_APP_WOM_API_KEY);
console.log("WOM_VERIFICATION_CODE exists:", !!process.env.WOM_VERIFICATION_CODE);
console.log("REACT_APP_WOM_VERIFICATION_CODE exists:", !!process.env.REACT_APP_WOM_VERIFICATION_CODE);
console.log("Using values:", !!supabaseUrl, !!supabaseKey, !!womApiKey, !!womGroupId, !!womVerificationCode);
console.log("WOM Group ID:", womGroupId);

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// WOM API base URL - Using v2 as per documentation
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
    if (!womVerificationCode) {
      throw new Error('WOM verification code is missing. Please add it to your environment variables as WOM_VERIFICATION_CODE or REACT_APP_WOM_VERIFICATION_CODE');
    }

    // Step 1: Request group update
    console.log(`Requesting update for WOM group ${womGroupId}`);
    
    // Using axios with updated endpoint and verification code
    const updateResponse = await axios({
      method: 'POST',
      url: `${WOM_API_BASE}/groups/${womGroupId}/update-all`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': womApiKey
      },
      data: {
        verificationCode: womVerificationCode
      }
    });
    
    console.log("Update response:", updateResponse.status, updateResponse.statusText);
    console.log("Update response data:", JSON.stringify(updateResponse.data, null, 2));
    
    // The update is now queuing in the background, according to the API docs
    // We need to wait longer for it to complete
    console.log('Update initiated. Waiting for group members to be updated (this may take several minutes)...');
    
    // Wait longer for updates to process - 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Step 2: Fetch updated group data
    console.log('Fetching updated group data...');
    
    // Using axios to get group data
    const groupResponse = await axios.get(
      `${WOM_API_BASE}/groups/${womGroupId}?includeMemberships=true`
    );
    
    // axios responses have data property
    const groupData = groupResponse.data;
    
    // Check if we have members
    if (!groupData.members || !Array.isArray(groupData.members)) {
      console.log("Group data structure:", JSON.stringify(groupData, null, 2));
      throw new Error('No members found in group data');
    }
    
    const { members } = groupData;
    
    // Step 3: Fetch details for each player
    console.log(`Updating ${members.length} members in database...`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let memberPromises = [];
    
    for (const member of members) {
      memberPromises.push((async () => {
        try {
          // Fetch detailed player data using axios
          const playerResponse = await axios.get(`${WOM_API_BASE}/players/${member.username}`);
          
          // axios responses have data property
          const playerData = playerResponse.data;
          
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
    
    // More detailed error information
    if (err.response) {
      console.error('API Error Response:', {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data,
        url: err.config.url
      });
    }
    
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
