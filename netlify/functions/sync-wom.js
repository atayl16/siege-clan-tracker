const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
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
    console.log("Starting WOM sync...");
    
    // Check if we have all required environment variables
    if (!WOM_GROUP_ID) {
      throw new Error('WOM_GROUP_ID is missing. Please check environment variables.');
    }
    
    console.log(`Using WOM Group ID: ${WOM_GROUP_ID}`);
    
    // Always fetch current WOM group members to ensure we have everyone
    console.log("Fetching current WOM group members...");
    const groupResponse = await fetch(`${WOM_API_BASE}/groups/${WOM_GROUP_ID}?includeMemberships=true`);
    
    if (!groupResponse.ok) {
      throw new Error(`Failed to fetch group data: ${groupResponse.status}`);
    }
    
    const groupData = await groupResponse.json();
    
    // Check if we got memberships from the API
    if (!groupData.memberships || !Array.isArray(groupData.memberships)) {
      throw new Error(`Invalid group data structure. Expected memberships array, got: ${JSON.stringify(Object.keys(groupData))}`);
    }
    
    // Extract all current WOM members
    const womMembers = groupData.memberships
      .filter(membership => membership.player && membership.player.username)
      .map(membership => ({
        wom_id: membership.playerId,
        wom_name: membership.player.username,
        name: membership.player.displayName || membership.player.username,
        womrole: membership.role || null
      }));
    
    console.log(`Found ${womMembers.length} members in WOM group`);
    
    // Fetch our existing members from the database
    console.log("Fetching existing members from database...");
    const { data: existingMembers, error: fetchError } = await supabase
      .from('members')
      .select('wom_id, wom_name');
    
    if (fetchError) throw new Error(`Failed to fetch members: ${fetchError.message}`);
    
    // Find members that exist in WOM but not in our database
    const existingWomIds = new Set(existingMembers.map(m => m.wom_id));
    const newMembers = womMembers.filter(m => !existingWomIds.has(m.wom_id));
    
    console.log(`Found ${newMembers.length} new members to add to the database`);
    
    // Add new members with as much data as we can get
    if (newMembers.length > 0) {
      let addedCount = 0;
      let errorCount = 0;
      
      // Process new members in batches
      const batchSize = 5;
      for (let i = 0; i < newMembers.length; i += batchSize) {
        const batch = newMembers.slice(i, i + batchSize);
        console.log(`Processing new members batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newMembers.length/batchSize)}`);
        
        await Promise.all(batch.map(async (member) => {
          try {
            // Fetch detailed player data for new member
            console.log(`Fetching initial data for new member ${member.wom_name}`);
            const playerResponse = await fetch(`${WOM_API_BASE}/players/${encodeURIComponent(member.wom_name)}`);
            
            if (!playerResponse.ok) {
              console.error(`Error fetching player ${member.wom_name}: ${playerResponse.status}`);
              errorCount++;
              return;
            }
            
            const playerData = await playerResponse.json();
            
            // Extract all relevant data for database columns
            const latestSnapshot = playerData.latestSnapshot?.data;
            const newMemberData = {
              wom_id: member.wom_id,
              name: playerData.displayName || member.name,
              wom_name: member.wom_name,
              current_lvl: latestSnapshot?.skills?.overall?.level || 1,
              current_xp: latestSnapshot?.skills?.overall?.experience || 0,
              ehb: Math.round(
                playerData.latestSnapshot?.data?.computed?.ehb?.value || 0
              ),
              womrole: member.womrole,
              siege_score: 0,
              join_date: playerData.registeredAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
            
            // Insert new member with complete data
            const { error } = await supabase.from("members").insert([newMemberData]);
            
            if (error) {
              console.error(`Error adding new member ${member.wom_name}:`, error);
              errorCount++;
            } else {
              console.log(`Added new member ${member.wom_name} with complete data`);
              addedCount++;
            }
          } catch (err) {
            console.error(`Exception adding new member ${member.wom_name}:`, err);
            errorCount++;
          }
        }));
        
        // Add a delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      console.log(`Added ${addedCount} new members with ${errorCount} errors`);
    }
    
    // Now fetch all members from our database for updating
    console.log("Fetching all members for updates...");
    const { data: membersToUpdate, error: updateFetchError } = await supabase
      .from('members')
      .select('wom_id, name, wom_name, current_xp, current_lvl, ehb')
      .order('wom_id', { ascending: true });
    
    if (updateFetchError) throw new Error(`Failed to fetch members for update: ${updateFetchError.message}`);
    
    console.log(`Processing updates for ${membersToUpdate.length} members`);
    
    // Process members in batches to avoid overwhelming the API
    let updatedCount = 0;
    let errorCount = 0;
    const batchSize = 5; // Process 5 members at a time
    
    for (let i = 0; i < membersToUpdate.length; i += batchSize) {
      const batch = membersToUpdate.slice(i, i + batchSize);
      console.log(`Processing update batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(membersToUpdate.length/batchSize)}`);
      
      await Promise.all(batch.map(async (member) => {
        try {
          if (!member.wom_name) {
            console.log(`Skipping member ${member.name || member.wom_id} - no WOM username`);
            return;
          }
          
          console.log(`Fetching data for ${member.wom_name}`);
          
          // Fetch detailed player data
          const playerResponse = await fetch(`${WOM_API_BASE}/players/${encodeURIComponent(member.wom_name)}`);
          
          if (!playerResponse.ok) {
            console.error(`Error fetching player ${member.wom_name}: ${playerResponse.status}`);
            errorCount++;
            return;
          }
          
          const playerData = await playerResponse.json();
          
          // Get the latest snapshot data
          const latestSnapshot = playerData.latestSnapshot?.data;
          const newXp = latestSnapshot?.skills?.overall?.experience || member.current_xp || 0;
          const newLevel = latestSnapshot?.skills?.overall?.level || member.current_lvl || 1;
          const newEhb = Math.round(playerData.latestSnapshot?.data?.computed?.ehb?.value || member.ehb || 0);
          
          // Check if member still exists in the WOM group
          const isInWomGroup = womMembers.some(m => m.wom_id === member.wom_id);
          
          // Update status if needed
          const status = isInWomGroup ? 'active' : (member.status === 'active' ? 'inactive' : member.status);
          
          // Update the member in Supabase
          const { error } = await supabase.from("members").update(
            {
              name: playerData.displayName || member.name || member.wom_name,
              current_lvl: newLevel,
              current_xp: newXp,
              ehb: newEhb,
              updated_at: new Date().toISOString()
            })
            .eq('wom_id', member.wom_id);
          
          if (error) {
            console.error(`Error updating member ${member.wom_name}:`, error);
            errorCount++;
          } else {
            updatedCount++;
          }
        } catch (err) {
          console.error(`Exception processing member ${member.wom_name || member.name || 'unknown'}:`, err);
          errorCount++;
        }
      }));
      
      // Add a delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`Sync completed! Updated ${updatedCount} members, with ${errorCount} errors`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Group sync completed',
        stats: {
          newMembers: newMembers.length,
          total: membersToUpdate.length,
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
