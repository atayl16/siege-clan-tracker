const WOM_API_URL = 'https://api.wiseoldman.net/v2';

// Fetch available metrics based on goal type
export async function fetchWomMetrics(goalType) {
  try {
    if (goalType === "skill") {
      // Hard-coded skills to avoid an unnecessary API call
      return [
        { metric: "overall", name: "Overall" },
        { metric: "attack", name: "Attack" },
        { metric: "defence", name: "Defence" },
        { metric: "strength", name: "Strength" },
        { metric: "hitpoints", name: "Hitpoints" },
        { metric: "ranged", name: "Ranged" },
        { metric: "prayer", name: "Prayer" },
        { metric: "magic", name: "Magic" },
        { metric: "cooking", name: "Cooking" },
        { metric: "woodcutting", name: "Woodcutting" },
        { metric: "fletching", name: "Fletching" },
        { metric: "fishing", name: "Fishing" },
        { metric: "firemaking", name: "Firemaking" },
        { metric: "crafting", name: "Crafting" },
        { metric: "smithing", name: "Smithing" },
        { metric: "mining", name: "Mining" },
        { metric: "herblore", name: "Herblore" },
        { metric: "agility", name: "Agility" },
        { metric: "thieving", name: "Thieving" },
        { metric: "slayer", name: "Slayer" },
        { metric: "farming", name: "Farming" },
        { metric: "runecrafting", name: "Runecrafting" },
        { metric: "hunter", name: "Hunter" },
        { metric: "construction", name: "Construction" },
      ];
    } else if (goalType === "boss") {
      // Hard-coded bosses because the API endpoint has changed
      return [
        { metric: "abyssal_sire", name: "Abyssal Sire" },
        { metric: "alchemical_hydra", name: "Alchemical Hydra" },
        { metric: "barrows_chests", name: "Barrows Chests" },
        { metric: "bryophyta", name: "Bryophyta" },
        { metric: "callisto", name: "Callisto" },
        { metric: "cerberus", name: "Cerberus" },
        { metric: "chambers_of_xeric", name: "Chambers of Xeric" },
        {
          metric: "chambers_of_xeric_challenge_mode",
          name: "Chambers of Xeric: Challenge Mode",
        },
        { metric: "chaos_elemental", name: "Chaos Elemental" },
        { metric: "chaos_fanatic", name: "Chaos Fanatic" },
        { metric: "commander_zilyana", name: "Commander Zilyana" },
        { metric: "corporeal_beast", name: "Corporeal Beast" },
        { metric: "crazy_archaeologist", name: "Crazy Archaeologist" },
        { metric: "dagannoth_prime", name: "Dagannoth Prime" },
        { metric: "dagannoth_rex", name: "Dagannoth Rex" },
        { metric: "dagannoth_supreme", name: "Dagannoth Supreme" },
        { metric: "deranged_archaeologist", name: "Deranged Archaeologist" },
        { metric: "general_graardor", name: "General Graardor" },
        { metric: "giant_mole", name: "Giant Mole" },
        { metric: "grotesque_guardians", name: "Grotesque Guardians" },
        { metric: "hespori", name: "Hespori" },
        { metric: "kalphite_queen", name: "Kalphite Queen" },
        { metric: "king_black_dragon", name: "King Black Dragon" },
        { metric: "kraken", name: "Kraken" },
        { metric: "kreearra", name: "Kree'arra" },
        { metric: "kril_tsutsaroth", name: "K'ril Tsutsaroth" },
        { metric: "mimic", name: "Mimic" },
        { metric: "nightmare", name: "Nightmare" },
        { metric: "phosanis_nightmare", name: "Phosani's Nightmare" },
        { metric: "obor", name: "Obor" },
        { metric: "sarachnis", name: "Sarachnis" },
        { metric: "scorpia", name: "Scorpia" },
        { metric: "skotizo", name: "Skotizo" },
        { metric: "tempoross", name: "Tempoross" },
        { metric: "the_gauntlet", name: "The Gauntlet" },
        { metric: "the_corrupted_gauntlet", name: "The Corrupted Gauntlet" },
        { metric: "theatre_of_blood", name: "Theatre of Blood" },
        {
          metric: "theatre_of_blood_hard_mode",
          name: "Theatre of Blood: Hard Mode",
        },
        {
          metric: "thermonuclear_smoke_devil",
          name: "Thermonuclear Smoke Devil",
        },
        { metric: "tombs_of_amascut", name: "Tombs of Amascut" },
        {
          metric: "tombs_of_amascut_expert",
          name: "Tombs of Amascut: Expert Mode",
        },
        { metric: "tzkal_zuk", name: "TzKal-Zuk" },
        { metric: "tztok_jad", name: "TzTok-Jad" },
        { metric: "venenatis", name: "Venenatis" },
        { metric: "vetion", name: "Vet'ion" },
        { metric: "vorkath", name: "Vorkath" },
        { metric: "wintertodt", name: "Wintertodt" },
        { metric: "zalcano", name: "Zalcano" },
        { metric: "zulrah", name: "Zulrah" },
      ];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching WOM metrics:', error);
    throw error;
  }
}

// Fetch player stats for a specific metric
// Update the fetchPlayerStats function to handle the new structure

export async function fetchPlayerStats(womId, goalType, metric) {
  try {
    console.log(`Fetching player stats: womId=${womId}, goalType=${goalType}, metric=${metric}`);
    
    // Fetch the player data
    const response = await fetch(`${WOM_API_URL}/players/id/${womId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch player stats: ${response.status}`);
      return goalType === 'skill' ? { experience: 0 } : { kills: 0 };
    }
    
    const playerData = await response.json();
    
    // Log the full response for debugging
    console.log("WOM API Response:", playerData);
    
    if (goalType === 'skill') {
      // Try the new structure first
      if (playerData.latestSnapshot?.data?.skills) {
        const skills = playerData.latestSnapshot.data.skills;
        
        if (skills[metric]) {
          console.log(`Found skill data for ${metric}:`, skills[metric]);
          return skills[metric];
        }
      }
      
      // Try alternative structures
      if (playerData.data?.skills && playerData.data.skills[metric]) {
        return playerData.data.skills[metric];
      }
      
      if (playerData.skills && playerData.skills[metric]) {
        return playerData.skills[metric];
      }
      
      // Check if it has snapshot data in an array format
      if (playerData.snapshots && playerData.snapshots.length > 0) {
        const latestSnapshot = playerData.snapshots[playerData.snapshots.length - 1];
        
        if (latestSnapshot.data?.skills && latestSnapshot.data.skills[metric]) {
          return latestSnapshot.data.skills[metric];
        }
        
        if (latestSnapshot.skills && latestSnapshot.skills[metric]) {
          return latestSnapshot.skills[metric];
        }
      }
      
      console.warn(`Could not find data for skill: ${metric}`);
      return { experience: 0, level: 1, rank: 0 };
    } 
    else if (goalType === 'boss') {
      // Try the new structure first
      if (playerData.latestSnapshot?.data?.bosses) {
        const bosses = playerData.latestSnapshot.data.bosses;
        
        if (bosses[metric]) {
          console.log(`Found boss data for ${metric}:`, bosses[metric]);
          return bosses[metric];
        }
      }
      
      // Try alternative structures
      if (playerData.data?.bosses && playerData.data.bosses[metric]) {
        return playerData.data.bosses[metric];
      }
      
      if (playerData.bosses && playerData.bosses[metric]) {
        return playerData.bosses[metric];
      }
      
      // Check if it has snapshot data in an array format
      if (playerData.snapshots && playerData.snapshots.length > 0) {
        const latestSnapshot = playerData.snapshots[playerData.snapshots.length - 1];
        
        if (latestSnapshot.data?.bosses && latestSnapshot.data.bosses[metric]) {
          return latestSnapshot.data.bosses[metric];
        }
        
        if (latestSnapshot.bosses && latestSnapshot.bosses[metric]) {
          return latestSnapshot.bosses[metric];
        }
      }
      
      console.warn(`Could not find data for boss: ${metric}`);
      return { kills: 0, rank: 0 };
    }
    
    console.warn(`Unsupported goal type: ${goalType}`);
    return goalType === 'skill' ? { experience: 0, level: 1, rank: 0 } : { kills: 0, rank: 0 };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return goalType === 'skill' ? { experience: 0, level: 1, rank: 0 } : { kills: 0, rank: 0 };
  }
}

export async function refreshPlayerData(womId) {
  try {
    console.log(`Refreshing player data for ID: ${womId}`);
    
    // Step 1: First fetch the player to get their username
    const fetchResponse = await fetch(`${WOM_API_URL}/players/id/${womId}`);
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch player data: ${fetchResponse.status}`);
    }
    
    const playerData = await fetchResponse.json();
    const username = playerData.username;
    
    if (!username) {
      throw new Error(`Could not find username for player ID: ${womId}`);
    }
    
    // Step 2: Use the correct endpoint to update the player
    const updateResponse = await fetch(`${WOM_API_URL}/players/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!updateResponse.ok) {
      console.warn(`Failed to update player: ${updateResponse.status}`);
      // Even if the update fails, we still have the player data from the first request
      return { 
        success: true, 
        method: 'fetch_only',
        playerData
      };
    }
    
    // Get the updated player data
    const updatedPlayerData = await updateResponse.json();
    
    return { 
      success: true, 
      method: 'update',
      playerData: updatedPlayerData
    };
  } catch (error) {
    console.error('Error updating player data:', error);
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}
