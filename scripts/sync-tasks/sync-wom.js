const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// WOM API configuration
const WOM_API_KEY = process.env.WOM_API_KEY || process.env.REACT_APP_WOM_API_KEY;
const WOM_GROUP_ID = process.env.WOM_GROUP_ID || process.env.REACT_APP_WOM_GROUP_ID;
const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

// Helper function to add delay with exponential backoff
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for API requests with retry logic
async function fetchWithRetry(url, options = {}, retries = 3, initialBackoff = 2000) {
  let lastError;
  let backoff = initialBackoff;
  
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
        return await response.json();
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

// Main function to sync WOM members
async function syncWomMembers() {
  try {
    console.log("🔄 Starting WOM member sync...");
    
    // Log environment variables status (without revealing values)
    console.log('Environment check:');
    console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- WOM_API_KEY: ${WOM_API_KEY ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- WOM_GROUP_ID: ${WOM_GROUP_ID ? 'Set ✓' : 'Missing ❌'}`);
    
    // Check if we have all required environment variables
    if (!WOM_GROUP_ID) {
      throw new Error('WOM_GROUP_ID is missing. Please check environment variables.');
    }
    
    console.log(`Using WOM Group ID: ${WOM_GROUP_ID}`);
    
    // Fetch current WOM group members with proper API key authentication
    console.log("Fetching current WOM group members...");
    const groupData = await fetchWithRetry(`${WOM_API_BASE}/groups/${WOM_GROUP_ID}?includeMemberships=true`);
    
    // Check if we got memberships from the API
    if (!groupData.memberships || !Array.isArray(groupData.memberships)) {
      throw new Error(`Invalid group data structure. Expected memberships array, got: ${JSON.stringify(Object.keys(groupData))}`);
    }
    
    // Extract all current WOM members
    const womMembers = groupData.memberships
      .filter(membership => membership.player && membership.player.username)
      .map(membership => ({
        wom_id: membership.playerId,
        wom_name: membership.player.username.toLowerCase(), // Store lowercase for easier comparison
        display_name: membership.player.displayName || membership.player.username,
        womrole: membership.role || null
      }));
    
    console.log(`Found ${womMembers.length} members in WOM group`);
    
    // Create a set of WOM IDs for quick lookup
    const womIds = new Set(womMembers.map(m => m.wom_id));
    const womNamesMap = new Map(womMembers.map(m => [m.wom_name, m]));

    const womRoleMap = new Map();
    womMembers.forEach((member) => {
      womRoleMap.set(member.wom_id, member.womrole);
    });
    
    // Fetch our existing members from the database
    console.log("Fetching existing members from database...");
    const { data: existingMembers, error: fetchError } = await supabase
      .from("members")
      .select("wom_id, wom_name, name, first_xp, first_lvl, join_date, name_history");
    
    if (fetchError) throw new Error(`Failed to fetch members: ${fetchError.message}`);
    
    // Find members that exist in WOM but not in our database
    const existingWomIds = new Set(existingMembers.map(m => m.wom_id));
    const newMembers = womMembers.filter(m => !existingWomIds.has(m.wom_id));
    
    console.log(`Found ${newMembers.length} new members to add to the database`);
    
    // Find members that exist in our database but not in WOM
    const missingMembers = existingMembers.filter(m => !womIds.has(m.wom_id));
    console.log(`Found ${missingMembers.length} members who are no longer in WOM group by ID`);
    
    // Before deleting, check if any missing members might have changed their name
    let deletedMembers = 0;
    let updatedNames = 0;
    const deletedMembersList = [];
    
    for (const member of missingMembers) {
      const memberName = member.name || member.wom_name || `ID ${member.wom_id}`;
      let nameMatch = null;
      let possibleMatches = [];
      
      // First check if we can find an exact match by name in current WOM members
      if (member.name) {
        const lowerName = member.name.toLowerCase();
        if (womNamesMap.has(lowerName)) {
          nameMatch = womNamesMap.get(lowerName);
          console.log(`Found exact name match for "${memberName}": WOM ID ${nameMatch.wom_id} (${nameMatch.wom_name})`);
        } else {
          // If no exact match, look for similar names
          for (const womMember of womMembers) {
            // Check if names are similar enough (case insensitive)
            if (
              (womMember.wom_name && member.name && 
                (womMember.wom_name.toLowerCase().includes(member.name.toLowerCase()) || 
                 member.name.toLowerCase().includes(womMember.wom_name.toLowerCase()))) ||
              (womMember.display_name && member.name &&
                (womMember.display_name.toLowerCase().includes(member.name.toLowerCase()) || 
                 member.name.toLowerCase().includes(womMember.display_name.toLowerCase())))
            ) {
              possibleMatches.push(womMember);
            }
          }
        }
      }
      
      // If we have possible matches but no exact match
      if (!nameMatch && possibleMatches.length > 0) {
        if (possibleMatches.length === 1) {
          nameMatch = possibleMatches[0];
          console.log(`Found likely name match for "${memberName}": WOM ID ${nameMatch.wom_id} (${nameMatch.display_name})`);
        } else {
          console.log(`Multiple possible name matches for "${memberName}": ${possibleMatches.map(m => m.display_name).join(', ')}`);
          
          // If we have multiple matches, try to choose the best one
          // We'll prefer names that include the original name
          nameMatch = possibleMatches.find(m => 
            m.display_name && m.display_name.toLowerCase().includes(member.name.toLowerCase())
          );
          
          if (nameMatch) {
            console.log(`Selected best name match for "${memberName}": WOM ID ${nameMatch.wom_id} (${nameMatch.display_name})`);
          }
        }
      }
      
      if (nameMatch) {
        // Update the member record with new WOM ID and name
        console.log(`✏️ Updating member "${memberName}" with new WOM ID: ${nameMatch.wom_id} (${nameMatch.display_name})`);
        
        // Get current name history or initialize empty array
        const nameHistory = member.name_history || [];
        
        // Add current name to history if not already there
        if (member.name && !nameHistory.includes(member.name)) {
          nameHistory.push(member.name);
        }
        
        // Preserve historical data when updating the WOM ID
        const { error: updateError } = await supabase
          .from('members')
          .update({
            wom_id: nameMatch.wom_id,
            wom_name: nameMatch.wom_name,
            name: nameMatch.display_name,
            name_history: nameHistory,
            updated_at: new Date().toISOString()
          })
          .eq('wom_id', member.wom_id);
        
        if (updateError) {
          console.error(`Error updating "${memberName}" with new WOM ID:`, updateError);
        } else {
          console.log(`✓ Successfully updated "${memberName}" → "${nameMatch.display_name}"`);
          updatedNames++;
        }
      } else {
        // Mark member as inactive instead of hard deleting
        console.log(`⚠️ Member "${memberName}" not found in WOM group and no name match. Marking as inactive.`);
        
        const { error: deactivateError } = await supabase
          .from('members')
          .update({
            active: false,
            left_date: new Date().toISOString(),
            notes: `Automatically marked inactive - no longer in WOM group as of ${new Date().toISOString()}`,
            updated_at: new Date().toISOString()
          })
          .eq('wom_id', member.wom_id);
          
        if (deactivateError) {
          console.error(`Error marking "${memberName}" as inactive:`, deactivateError);
        } else {
          console.log(`🚫 Successfully marked "${memberName}" as inactive`);
          deletedMembers++;
          deletedMembersList.push(memberName);
        }
      }
    }
    
    // Add new members with as much data as we can get
    let addedCount = 0;
    let errorCount = 0;
    
    if (newMembers.length > 0) {
      // Process new members sequentially to avoid rate limits
      for (const member of newMembers) {
        try {
          console.log(`Fetching initial data for new member ID ${member.wom_id} (${member.wom_name})`);
          
          // Fetch detailed player data with proper error handling and retries
          const playerData = await fetchWithRetry(`${WOM_API_BASE}/players/id/${member.wom_id}`);
          
          // Extract all relevant data for database columns
          const latestSnapshot = playerData.latestSnapshot?.data;
          const newMemberData = {
            wom_id: member.wom_id,
            name: playerData.displayName || member.display_name,
            wom_name: member.wom_name,
            current_lvl: latestSnapshot?.skills?.overall?.level || 1,
            current_xp: latestSnapshot?.skills?.overall?.experience || 0,
            // Set first_xp and first_lvl to current values for new members
            first_xp: latestSnapshot?.skills?.overall?.experience || 0,
            first_lvl: latestSnapshot?.skills?.overall?.level || 1,
            ehb: Math.round(
              playerData.latestSnapshot?.data?.computed?.ehb?.value || 0
            ),
            womrole: member.womrole,
            siege_score: 0,
            active: true,
            join_date: playerData.registeredAt || new Date().toISOString(),
            name_history: [],
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
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
        
        // Add a delay between requests to avoid rate limiting
        await delay(2000);
      }
      
      console.log(`Added ${addedCount} new members with ${errorCount} errors`);
    }
    
    // Now fetch all active members from our database for updating
    console.log("Fetching all active members for updates...");
    const { data: membersToUpdate, error: updateFetchError } = await supabase
      .from('members')
      .select('wom_id, name, wom_name, current_xp, current_lvl, ehb, name_history')
      .eq('active', true)
      .order('wom_id', { ascending: true });
    
    if (updateFetchError) throw new Error(`Failed to fetch members for update: ${updateFetchError.message}`);
    
    console.log(`Processing updates for ${membersToUpdate.length} active members`);
    
    // For testing - uncomment to limit the number of members processed
    // const TEST_MODE = true;
    // const TEST_LIMIT = 5;
    // const membersToProcess = TEST_MODE ? membersToUpdate.slice(0, TEST_LIMIT) : membersToUpdate;
    const membersToProcess = membersToUpdate;
    
    // Process members sequentially to avoid rate limits
    let updatedCount = 0;
    errorCount = 0; // Reset error count
    
    for (let i = 0; i < membersToProcess.length; i++) {
      const member = membersToProcess[i];
      console.log(`Processing member ${i+1}/${membersToProcess.length}: ${member.name || member.wom_name || 'unknown'}`);
      
      try {
        // Skip members without a WOM ID
        if (!member.wom_id) {
          console.log(`Skipping member ${member.name || 'unknown'} - no WOM ID`);
          continue;
        }
        
        console.log(`Fetching data for player ID ${member.wom_id} (${member.wom_name || member.name || 'unknown'})`);
        
        // Use fetchWithRetry for improved error handling
        const playerData = await fetchWithRetry(`${WOM_API_BASE}/players/id/${member.wom_id}`);
        
        // Get the latest snapshot data
        const latestSnapshot = playerData.latestSnapshot?.data;
        const newXp = latestSnapshot?.skills?.overall?.experience || member.current_xp || 0;
        const newLevel = latestSnapshot?.skills?.overall?.level || member.current_lvl || 1;
        const newEhb = Math.round(playerData.latestSnapshot?.data?.computed?.ehb?.value || member.ehb || 0);
        
        // Check if username has changed
        const womUsernameChanged = playerData.username && 
                                  playerData.username.toLowerCase() !== (member.wom_name || '').toLowerCase();
                                  
        if (womUsernameChanged) {
          console.log(`Username changed for player ${member.wom_id}: ${member.wom_name || 'unknown'} → ${playerData.username}`);
        }
        
        // Prepare basic update data (always update this data)
        const updateData = {
          name: playerData.displayName || playerData.username || member.name || member.wom_name,
          current_lvl: newLevel,
          current_xp: newXp,
          ehb: newEhb,
          last_seen_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add the WOM role to updateData if available from group API
        if (womRoleMap.has(member.wom_id)) {
          const currentRole = womRoleMap.get(member.wom_id);
          updateData.womrole = currentRole;
          
          // Log if role has changed
          if (member.womrole !== currentRole) {
            console.log(`Role changed for ${member.name || member.wom_name}: ${member.womrole || 'none'} → ${currentRole}`);
          }
        }
        
        // Only update wom_name and name_history if the username changed
        if (womUsernameChanged) {
          // Get current name history or initialize empty array
          const nameHistory = Array.isArray(member.name_history) ? [...member.name_history] : [];
          
          // Add current name to history if it's not already there
          if (member.name && !nameHistory.includes(member.name)) {
            nameHistory.push(member.name);
          }
          
          updateData.wom_name = playerData.username;
          updateData.name_history = nameHistory;
        }
        
        // Update the member with all updated data
        const { error } = await supabase
          .from("members")
          .update(updateData)
          .eq('wom_id', member.wom_id);
        
        if (error) {
          console.error(`Error updating member ${member.wom_id}:`, error);
          errorCount++;
        } else {
          updatedCount++;
        }
      } catch (err) {
        console.error(`Exception processing member ${member.wom_id} (${member.wom_name || member.name || 'unknown'}):`, err);
        errorCount++;
      }
      
      // Add a delay between requests to avoid rate limiting
      await delay(2000);
    }
    
    console.log(`Sync completed! Updated ${updatedCount} members, with ${errorCount} errors`);
    console.log(`Members marked inactive: ${deletedMembers}`);
    console.log(`Members with updated names: ${updatedNames}`);
    
    if (deletedMembersList.length > 0) {
      console.log(`Inactive members list: ${deletedMembersList.join(', ')}`);
    }
    
    return {
      newMembers: addedCount,
      deletedMembers: deletedMembers,
      updatedNames: updatedNames,
      deletedList: deletedMembersList,
      total: membersToProcess.length,
      updated: updatedCount,
      errors: errorCount
    };
    
  } catch (err) {
    console.error('❌ Error in WOM sync:', err);
    throw err;
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting WOM member sync as standalone script');
  syncWomMembers()
    .then(results => {
      console.log('✅ WOM member sync completed successfully', results);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ WOM member sync failed:', err);
      process.exit(1);
    });
}

// Export the function for potential reuse in other scripts
module.exports = { syncWomMembers };
