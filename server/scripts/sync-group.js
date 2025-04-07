const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // Replace fetch with axioseplace fetch with axios

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
    
    // Using axios instead of fetchstead of fetch
    const updateResponse = await axios({Response = await axios({
      method: 'POST',
      url: `${WOM_API_BASE}/groups/${womGroupId}/update`,oups/${womGroupId}/update`,
      headers: {eaders: {
        'Content-Type': 'application/json', 'Content-Type': 'application/json',
        'x-api-key': womApiKey    'x-api-key': womApiKey
      }
    });
    
    // axios responses have data property instead of json() method/ axios responses have data property instead of json() method
    const updateData = updateResponse.data;const updateData = updateResponse.data;
    const jobId = updateData.job?.id;
    
    if (!jobId) {if (!jobId) {
      throw new Error('No job ID returned from update request');rror('No job ID returned from update request');
    }
    
    // Step 2: Poll for job completion// Step 2: Poll for job completion
    console.log(`Waiting for job ${jobId} to complete...`);obId} to complete...`);
    
    // Poll for a maximum of 5 minutes (30 attempts, 10 seconds apart)onds apart)
    let jobComplete = false;let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!jobComplete && attempts < maxAttempts) {attempts < maxAttempts) {
      attempts++;  attempts++;
      
      // Using axios instead of fetchios instead of fetch
      const jobResponse = await axios.get(`${WOM_API_BASE}/jobs/${jobId}`);const jobResponse = await axios.get(`${WOM_API_BASE}/jobs/${jobId}`);
      
      // axios responses have data property// axios responses have data property
      const jobData = jobResponse.data;ponse.data;
      
      if (jobData.status === 'completed') {f (jobData.status === 'completed') {
        jobComplete = true;  jobComplete = true;
        console.log('Job completed successfully');');
      } else if (jobData.status === 'failed') {} else if (jobData.status === 'failed') {
        throw new Error(`Job failed: ${jobData.error || 'Unknown error'}`);ata.error || 'Unknown error'}`);
      } else {
        // Wait 10 seconds before checking again
        if (attempts < maxAttempts) {
          console.log(`Job in progress (${jobData.status}), waiting 10 seconds...`);nds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));t new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    if (!jobComplete) {jobComplete) {
      throw new Error('Job timed out after 5 minutes');hrow new Error('Job timed out after 5 minutes');
    }
    
    // Step 3: Fetch updated group datadated group data
    console.log('Fetching updated group data...');
    
    // Using axios instead of fetch// Using axios instead of fetch
    const groupResponse = await axios.get(et(
      `${WOM_API_BASE}/groups/${womGroupId}?includeMemberships=true`eMemberships=true`
    );
    
    // axios responses have data propertydata property
    const groupData = groupResponse.data;
    const { members } = groupData;onst { members } = groupData;
    
    // Step 4: Fetch details for each player
    console.log(`Updating ${members.length} members in database...`);s.length} members in database...`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let memberPromises = [];let memberPromises = [];
    
    for (const member of members) {f members) {
      memberPromises.push((async () => {sync () => {
        try {    try {
          // Fetch detailed player data using axiosdata using axios
          const playerResponse = await axios.get(`${WOM_API_BASE}/players/${member.username}`);xios.get(`${WOM_API_BASE}/players/${member.username}`);
          
          // axios responses have data propertyproperty
          const playerData = playerResponse.data;
          
          // Update the member in Supabaseupabase
          const { error } = await supabase
            .from('members')s')
            .upsert({({
              wom_id: member.id,   wom_id: member.id,
              name: member.displayName || member.username,    name: member.displayName || member.username,
              wom_name: member.displayName,
              current_lvl: playerData.latestSnapshot?.data?.skills?.overall?.level || null,    current_lvl: playerData.latestSnapshot?.data?.skills?.overall?.level || null,
              current_xp: playerData.latestSnapshot?.data?.skills?.overall?.experience || null,tSnapshot?.data?.skills?.overall?.experience || null,
              ehb: playerData.latestSnapshot?.data?.computed?.ehb || null,ot?.data?.computed?.ehb || null,
              womrole: member.role || nullr.role || null
            }, { 
              onConflict: 'wom_id',d',
              ignoreDuplicates: false 
            });
          
          if (error) {
            console.error(`Error updating member ${member.username}:`, error);or);
            errorCount++;
          } else {{
            updatedCount++;
          }
        } catch (err) { (err) {
          console.error(`Exception processing member ${member.username}:`, err);console.error(`Exception processing member ${member.username}:`, err);
          errorCount++;;
        }
      })());
      
      // Process in batches of 5 to avoid overwhelming the API of 5 to avoid overwhelming the API
      if (memberPromises.length >= 5) {emberPromises.length >= 5) {
        await Promise.all(memberPromises);ll(memberPromises);
        memberPromises = [];
        // Small delay to respect API rate limitsto respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));wait new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Process any remaining members
    if (memberPromises.length > 0) {
      await Promise.all(memberPromises);erPromises);
    }
    
    const result = {st result = {
      message: 'Group sync completed', message: 'Group sync completed',
      stats: {  stats: {
        total: members.length,
        updated: updatedCount,
        errors: errorCount
      } }
    };};
    
    // Return appropriate response based on contexted on context
    if (isNetlifyFunction) {ifyFunction) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result) body: JSON.stringify(result)
      };};
    } else {} else {
      console.log(result);
      return result;
    }
    
  } catch (err) {{
    console.error('Error in sync operation:', err);ration:', err);
    
    const errorResult = {rorResult = {
      error: 'Failed to sync with WOM',nc with WOM',
      message: err.messageessage
    };;
    
    if (isNetlifyFunction) {Function) {
      return {
        statusCode: 500,    statusCode: 500,
        headers,
        body: JSON.stringify(errorResult)t)
      };
    } else {else {
      console.error(errorResult);  console.error(errorResult);
      throw err; // Re-throw for script context for script context
    }
  }
};

// Export as a Netlify function handlert as a Netlify function handler
exports.handler = async (event, context) => {ler = async (event, context) => {
  // Handle OPTIONS request (CORS preflight) preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {eturn {
      statusCode: 200,   statusCode: 200,
      headers: {    headers: {
        'Access-Control-Allow-Origin': '*',        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Preflight call successful' }),Preflight call successful' }),
    };
  }
  
  return syncGroup(event);
};

// If running directly (not as a Netlify function), execute the syncnning directly (not as a Netlify function), execute the sync
if (!isNetlifyFunction && require.main === module) {
  syncGroup()Group()
    .then(() => { .then(() => {
      console.log('Sync completed successfully');    console.log('Sync completed successfully');
      process.exit(0);
    })  })
    .catch(err => {    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}
