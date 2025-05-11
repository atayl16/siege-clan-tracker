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
    console.log("🔄 Starting optimized WOM member sync...");
    
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
        womrole: membership.role || null,
        build: membership.player.build || null,
      }));
    
    console.log(`Found ${womMembers.length} members in WOM group`);
    
    // Create maps for quick lookups
    const womIdsMap = new Map(womMembers.map(m => [m.wom_id, m]));
    const womNamesMap = new Map(womMembers.map(m => [m.wom_name, m]));
    
    // OPTIMIZATION 1: Get the last sync time to optimize processing
    const { data: syncInfo } = await supabase
      .from("sync_logs")
      .select("last_sync")
      .eq("type", "wom_members")
      .order("last_sync", { ascending: false })
      .limit(1)
      .single();
    
    const lastSyncTime = syncInfo?.last_sync || new Date(0).toISOString();
    console.log(`Last sync time: ${lastSyncTime}`);
    
    // OPTIMIZATION 2: Prioritize different operations per run
    const currentHour = new Date().getHours();
    
    // Get our existing members from the database
    console.log("Fetching existing members from database...");
    const { data: existingMembers, error: fetchError } = await supabase
      .from("members")
      .select("wom_id, wom_name, name, first_xp, first_lvl, join_date, name_history, updated_at, active, current_xp, current_lvl, ehb, womrole");
    
    if (fetchError) throw new Error(`Failed to fetch members: ${fetchError.message}`);
    
    // Create a map for our members for easier lookup
    const existingMembersMap = new Map(existingMembers.map(m => [m.wom_id, m]));
    
    // Process new members (those in WOM but not in our database)
    const newMembers = womMembers.filter(m => !existingMembersMap.has(m.wom_id));
    console.log(`Found ${newMembers.length} new members to add`);
    
    // Process missing members (those in our DB but no longer in WOM) - limit to 10 per run
    const missingMembers = existingMembers
      .filter(m => m.active && !womIdsMap.has(m.wom_id))
      .slice(0, 10);
    console.log(`Processing ${missingMembers.length} missing members (limited to 10 per run)`);
    
    // Determine which existing members to update in this run
    // If we have new or missing members, prioritize processing those
    let membersToUpdate = [];
    
    if (newMembers.length > 0 || missingMembers.length > 0) {
      console.log("Prioritizing new/missing member processing");
    } else {
      // Otherwise update a subset of existing members (25% each hour)
      const activeMembers = existingMembers.filter(m => m.active);
      const bucketSize = Math.ceil(activeMembers.length / 4);
      const bucketIndex = currentHour % 4;
      
      membersToUpdate = activeMembers
        .filter((_, index) => Math.floor(index / bucketSize) === bucketIndex)
      
      console.log(`Updating subset of members (bucket ${bucketIndex+1}/4): ${membersToUpdate.length} members`);
    }
    
    // Track results
    let addedCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;
    let nameUpdatesCount = 0;
    let errorCount = 0;
    
    // Process new members - limit to 10 per run
    if (newMembers.length > 0) {
      console.log(`Processing ${Math.min(10, newMembers.length)} new members`);
      
      // Process in small batches (3 at a time) to balance throughput vs. rate limits
      for (let i = 0; i < Math.min(10, newMembers.length); i += 3) {
        const batch = newMembers.slice(i, i + 3);
        
        await Promise.all(batch.map(async (member) => {
          try {
            console.log(`Fetching data for new member ${member.wom_name}`);
            const playerData = await fetchWithRetry(`${WOM_API_BASE}/players/id/${member.wom_id}`);
            
            // Process and insert new member
            const latestSnapshot = playerData.latestSnapshot?.data;
            const newMemberData = {
              wom_id: member.wom_id,
              name: playerData.displayName || member.display_name,
              wom_name: member.wom_name,
              current_lvl: latestSnapshot?.skills?.overall?.level || 1,
              current_xp: latestSnapshot?.skills?.overall?.experience || 0,
              first_xp: latestSnapshot?.skills?.overall?.experience || 0,
              first_lvl: latestSnapshot?.skills?.overall?.level || 1,
              ehb: Math.round(
                playerData.latestSnapshot?.data?.computed?.ehb?.value || 0
              ),
              womrole: member.womrole,
              build: member.build || playerData.type || "regular",
              siege_score: 0,
              active: true,
              join_date: playerData.registeredAt || new Date().toISOString(),
              name_history: [],
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
            
            const { error } = await supabase.from("members").insert([newMemberData]);
            
            if (error) {
              console.error(`Error adding new member ${member.wom_name}:`, error);
              errorCount++;
            } else {
              console.log(`Added new member ${member.wom_name}`);
              addedCount++;
            }
          } catch (err) {
            console.error(`Exception adding new member ${member.wom_name}:`, err);
            errorCount++;
          }
        }));
        
        // Delay between batches to avoid rate limiting
        await delay(1000);
      }
    }
    
    // Process missing members (potentially renamed or left)
    for (const member of missingMembers) {
      const memberName = member.name || member.wom_name || `ID ${member.wom_id}`;
      
      // Look for a possible name match in current WOM members
      let nameMatch = null;
      let possibleMatches = [];
      
      if (member.name) {
        const lowerName = member.name.toLowerCase();
        
        // Check for exact name match
        if (womNamesMap.has(lowerName)) {
          nameMatch = womNamesMap.get(lowerName);
          console.log(`Found exact name match for "${memberName}": WOM ID ${nameMatch.wom_id}`);
        } else {
          // Look for similar names
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
          
          // If we have exactly one possible match, use it
          if (possibleMatches.length === 1) {
            nameMatch = possibleMatches[0];
            console.log(`Found likely name match for "${memberName}": ${nameMatch.display_name}`);
          } else if (possibleMatches.length > 1) {
            // If multiple matches, try to find best one
            nameMatch = possibleMatches.find(m => 
              m.display_name && m.display_name.toLowerCase().includes(member.name.toLowerCase())
            );
            
            if (nameMatch) {
              console.log(`Selected best match for "${memberName}": ${nameMatch.display_name}`);
            }
          }
        }
      }
      
      if (nameMatch) {
        // *** NEW CODE: Check if this WOM ID already exists in our database ***
        const duplicateCheck = existingMembers.find(m => m.wom_id === nameMatch.wom_id);
        
        if (duplicateCheck) {
          console.log(`Found duplicate record situation: "${memberName}" (ID: ${member.wom_id}) and "${duplicateCheck.name}" (ID: ${duplicateCheck.wom_id})`);
          
          // Determine which record to keep - prefer the one with most recent activity
          const oldRecord = member;
          const newRecord = duplicateCheck;
          
          console.log(`Merging records for name change: "${oldRecord.name}" → "${newRecord.name}"`);
          
          // Merge important data from old record to new record
          const mergeData = {};
          
          // Take the older join_date if available
          if (oldRecord.join_date && (!newRecord.join_date || new Date(oldRecord.join_date) < new Date(newRecord.join_date))) {
            mergeData.join_date = oldRecord.join_date;
          }
          
          // Take the lower first_xp/first_lvl if available
          if (oldRecord.first_xp !== undefined && (newRecord.first_xp === undefined || oldRecord.first_xp < newRecord.first_xp)) {
            mergeData.first_xp = oldRecord.first_xp;
          }
          
          if (oldRecord.first_lvl !== undefined && (newRecord.first_lvl === undefined || oldRecord.first_lvl < newRecord.first_lvl)) {
            mergeData.first_lvl = oldRecord.first_lvl;
          }
          
          // Merge name histories
          let combinedHistory = newRecord.name_history || [];
          
          // Add old name if not in history
          if (oldRecord.name && !combinedHistory.includes(oldRecord.name)) {
            combinedHistory.push(oldRecord.name);
          }
          
          // Add all names from old record's history that aren't in the new history
          if (oldRecord.name_history && Array.isArray(oldRecord.name_history)) {
            oldRecord.name_history.forEach(name => {
              if (!combinedHistory.includes(name)) {
                combinedHistory.push(name);
              }
            });
          }
          
          if (combinedHistory.length > 0) {
            mergeData.name_history = combinedHistory;
          }
          
          // Apply any noteworthy notes
          if (oldRecord.notes && oldRecord.notes.trim()) {
            mergeData.notes = (newRecord.notes ? newRecord.notes + "\n\n" : "") + 
                              `Previous notes from ${oldRecord.name}: ${oldRecord.notes}`;
          }
          
          // Add any other fields that should be preserved
          
          console.log(`Merging data from old record: ${JSON.stringify(mergeData)}`);
          
          // Update the new record with merged data
          if (Object.keys(mergeData).length > 0) {
            const { error: mergeError } = await supabase
              .from('members')
              .update({
                ...mergeData,
                updated_at: new Date().toISOString()
              })
              .eq('wom_id', newRecord.wom_id);
            
            if (mergeError) {
              console.error(`Error merging data for "${newRecord.name}":`, mergeError);
              errorCount++;
            } else {
              console.log(`Successfully merged data to "${newRecord.name}"`);
            }
          }
          
          // Delete the old record since we've merged its data to the new one
          const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .eq('wom_id', oldRecord.wom_id);
          
          if (deleteError) {
            console.error(`Error deleting old record "${oldRecord.name}":`, deleteError);
            errorCount++;
          } else {
            console.log(`Successfully deleted old record "${oldRecord.name}" after merging`);
            nameUpdatesCount++;
          }
        }
        else {
          // Original code for updating the member with new WOM ID (when no duplicate exists)
          console.log(`Updating ${memberName} with new WOM ID: ${nameMatch.wom_id}`);
          
          // Get current name history or initialize empty array
          const nameHistory = member.name_history || [];
          
          // Add current name to history if not already there
          if (member.name && !nameHistory.includes(member.name)) {
            nameHistory.push(member.name);
          }
          
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
            errorCount++;
          } else {
            console.log(`Successfully updated "${memberName}" → "${nameMatch.display_name}"`);
            nameUpdatesCount++;
          }
        }
      } else {
        // Mark member as inactive (left clan case) - unchanged from your original code
        console.log(`Member "${memberName}" not found in WOM group - marking as inactive`);
        
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
          errorCount++;
        } else {
          console.log(`Successfully marked "${memberName}" as inactive`);
          deactivatedCount++;
        }
      }
    }
    
    // Process member updates if we have any
    if (membersToUpdate.length > 0) {
      console.log(`Processing updates for ${membersToUpdate.length} active members`);
      
      // Process in batches of 5 to balance throughput vs. rate limits
      for (let i = 0; i < membersToUpdate.length; i += 5) {
        const batch = membersToUpdate.slice(i, i + 5);
        
        await Promise.all(batch.map(async (member) => {
          try {
            console.log(`Fetching data for member ${member.name || member.wom_name}`);
            const playerData = await fetchWithRetry(`${WOM_API_BASE}/players/id/${member.wom_id}`);
            
            // Extract updated data
            const latestSnapshot = playerData.latestSnapshot?.data;
            const newXp = latestSnapshot?.skills?.overall?.experience || member.current_xp || 0;
            const newLevel = latestSnapshot?.skills?.overall?.level || member.current_lvl || 1;
            const newEhb = Math.round(playerData.latestSnapshot?.data?.computed?.ehb?.value || member.ehb || 0);
            
            // Check if anything meaningful has changed
            const usernameChanged = playerData.username && 
                                   playerData.username.toLowerCase() !== (member.wom_name || '').toLowerCase();
            const dataChanged = newXp !== member.current_xp || 
                               newLevel !== member.current_lvl || 
                               newEhb !== member.ehb;
            
            if (usernameChanged || dataChanged) {
              // Prepare update data
              const updateData = {
                current_lvl: newLevel,
                current_xp: newXp,
                ehb: newEhb,
                last_seen_date: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // Update role from WOM if available
              if (womIdsMap.has(member.wom_id)) {
                const womMember = womIdsMap.get(member.wom_id);
                if (womMember.womrole !== undefined) {
                  updateData.womrole = womMember.womrole;
                }
                if (
                  womMember.build !== undefined &&
                  womMember.build !== member.build
                ) {
                  updateData.build = womMember.build;
                  console.log(
                    `Updating build for ${member.name}: ${
                      member.build || "none"
                    } → ${womMember.build}`
                  );
                }
              }
              
              // Handle username change if needed
              if (usernameChanged) {
                console.log(`Username changed for ${member.name}: ${member.wom_name} → ${playerData.username}`);
                
                // Get current name history or initialize empty array
                const nameHistory = Array.isArray(member.name_history) ? [...member.name_history] : [];
                
                // Add current name to history if not already there
                if (member.name && !nameHistory.includes(member.name)) {
                  nameHistory.push(member.name);
                }
                
                updateData.wom_name = playerData.username.toLowerCase();
                updateData.name = playerData.displayName || playerData.username;
                updateData.name_history = nameHistory;
              }
              
              // Update the member
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
            }
          } catch (err) {
            console.error(`Error updating member ${member.wom_id}:`, err);
            errorCount++;
          }
        }));
        
        // Add a short delay between batches
        await delay(1000);
      }
    }
    
    // Update the sync log
    await supabase
      .from("sync_logs")
      .upsert({
        type: "wom_members",
        last_sync: new Date().toISOString(),
        details: JSON.stringify({
          added: addedCount,
          updated: updatedCount,
          deactivated: deactivatedCount,
          nameUpdates: nameUpdatesCount,
          errors: errorCount
        })
      });
    
    console.log(`
Sync completed!
- Added: ${addedCount} new members
- Updated: ${updatedCount} existing members
- Name updates: ${nameUpdatesCount}
- Marked inactive: ${deactivatedCount}
- Errors: ${errorCount}
    `);
    
    return {
      added: addedCount,
      updated: updatedCount,
      deactivated: deactivatedCount,
      nameUpdates: nameUpdatesCount,
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
