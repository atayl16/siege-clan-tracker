// Rank name definitions
export const SKILLER_RANK_NAMES = ["Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte"];
export const FIGHTER_RANK_NAMES = ["Mentor", "Prefect", "Leader", "Supervisor", "Superior", "Executive", "Senator", "Monarch", "TzKal"];

// Rank threshold definitions
export const SKILLER_RANKS = [
  { name: "Opal", color: "moccasin", range: [0, 3000000], description: "New Member" },
  { name: "Sapphire", color: "blue", range: [3000000, 8000000], description: "3,000,000 XP" },
  { name: "Emerald", color: "lime", range: [8000000, 15000000], description: "8,000,000 XP" },
  { name: "Ruby", color: "red", range: [15000000, 40000000], description: "15,000,000 XP" },
  { name: "Diamond", color: "white", range: [40000000, 90000000], description: "40,000,000 XP" },
  { name: "Dragonstone", color: "magenta", range: [90000000, 150000000], description: "90,000,000 XP" },
  { name: "Onyx", color: "grey", range: [150000000, 500000000], description: "150,000,000 XP" },
  { name: "Zenyte", color: "orange", range: [500000000, Infinity], description: "500,000,000 XP" }
];

export const FIGHTER_RANKS = [
  { name: "Mentor", range: [0, 100], description: "0 EHB" },
  { name: "Prefect", range: [100, 300], description: "100 EHB" },
  { name: "Leader", range: [300, 500], description: "300 EHB" },
  { name: "Supervisor", range: [500, 700], description: "500 EHB" },
  { name: "Superior", range: [700, 900], description: "700 EHB" },
  { name: "Executive", range: [900, 1100], description: "900 EHB" },
  { name: "Senator", range: [1100, 1300], description: "1100 EHB" },
  { name: "Monarch", range: [1300, 1500], description: "1300 EHB" },
  { name: "TzKal", range: [1500, Infinity], description: "1500 EHB" }
];

// Helper functions
export const safeFormat = (value) => {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString();
};

export const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const calculateNextLevel = (member) => {
  if (!member) return 0;
  
  const womRole = (member.womrole || "").toLowerCase().trim();
  
  // Determine if the member is a skiller or fighter based on their womrole
  const isSkiller = SKILLER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  const isFighter = FIGHTER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  
  if (isSkiller) {
    // Calculate clan XP (current - initial) with safe parsing
    const clanXp = safeParseInt(member.current_xp) - safeParseInt(member.first_xp);

    // Find which rank range the member is in
    for (let i = 0; i < SKILLER_RANKS.length; i++) {
      const rank = SKILLER_RANKS[i];
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        // Check if this is the last rank (max rank)
        if (i === SKILLER_RANKS.length - 1) {
          return 0; // Already at max rank
        }
        // Return the XP needed to reach the next rank
        return rank.range[1] - clanXp;
      }
    }

    // If they're at the highest rank already
    if (clanXp >= SKILLER_RANKS[SKILLER_RANKS.length - 1].range[0]) {
      return 0; // Already at max rank
    }
  } else if (isFighter) {
    // Use EHB for fighters with safe parsing
    const clanEhb = safeParseInt(member.ehb);

    // Find which rank range the member is in
    for (let i = 0; i < FIGHTER_RANKS.length; i++) {
      const rank = FIGHTER_RANKS[i];
      if (clanEhb >= rank.range[0] && clanEhb < rank.range[1]) {
        // Check if this is the last rank (max rank)
        if (i === FIGHTER_RANKS.length - 1) {
          return 0; // Already at max rank
        }
        // Return the EHB needed to reach the next rank
        return rank.range[1] - clanEhb;
      }
    }

    // If they're at the highest rank already
    if (clanEhb >= FIGHTER_RANKS[FIGHTER_RANKS.length - 1].range[0]) {
      return 0; // Already at max rank
    }
  }
  
  // Default return if we couldn't determine the next level
  return 0;
};

export const calculateAppropriateRank = (member) => {
  if (!member) return null;
  
  // Calculate clan XP (current - initial) with safe parsing
  const clanXp = safeParseInt(member.current_xp) - safeParseInt(member.first_xp);
  const clanEhb = safeParseInt(member.ehb);
  
  // Determine if the member is a skiller or fighter based on their womrole
  const womRole = (member.womrole || "").toLowerCase().trim();
  const isSkiller = SKILLER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  const isFighter = FIGHTER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  
  let appropriateRank = null;
  
  if (isSkiller) {
    // Find the appropriate skiller rank based on XP
    for (const rank of SKILLER_RANKS) {
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        appropriateRank = rank.name;
        break;
      }
    }
    // If they're at max XP, give them the highest rank
    if (clanXp >= SKILLER_RANKS[SKILLER_RANKS.length - 1].range[0]) {
      appropriateRank = SKILLER_RANKS[SKILLER_RANKS.length - 1].name;
    }
  } else if (isFighter) {
    // Find the appropriate fighter rank based on EHB
    for (const rank of FIGHTER_RANKS) {
      if (clanEhb >= rank.range[0] && clanEhb < rank.range[1]) {
        appropriateRank = rank.name;
        break;
      }
    }
    // If they're at max EHB, give them the highest rank
    if (clanEhb >= FIGHTER_RANKS[FIGHTER_RANKS.length - 1].range[0]) {
      appropriateRank = FIGHTER_RANKS[FIGHTER_RANKS.length - 1].name;
    }
  }
  
  return appropriateRank;
};

export const memberNeedsRankUpdate = (member) => {
  // Skip hidden members or those with missing wom_id
  if (!member || member.hidden || !member.wom_id) {
    return false;
  }
  
  // Must have a role to determine current status
  if (!member.womrole) {
    return false;
  }
  
  const womRole = (member.womrole || "").toLowerCase();
  
  // Determine if member is skiller or fighter based on current role
  const isSkiller = 
    womRole.includes("opal") || womRole.includes("sapphire") || 
    womRole.includes("emerald") || womRole.includes("ruby") || 
    womRole.includes("diamond") || womRole.includes("dragonstone") || 
    womRole.includes("onyx") || womRole.includes("zenyte");
  
  const isFighter = 
    womRole.includes("mentor") || womRole.includes("prefect") || 
    womRole.includes("leader") || womRole.includes("supervisor") || 
    womRole.includes("superior") || womRole.includes("executive") || 
    womRole.includes("senator") || womRole.includes("monarch") || 
    womRole.includes("tzkal");
  
  // If we can't determine the type, then they don't need an update
  if (!isSkiller && !isFighter) {
    return false;
  }
  
  if (isSkiller) {
    // Use safe parsing to handle string or number types
    const firstXp = parseInt(member.first_xp) || 0;
    const currentXp = parseInt(member.current_xp) || 0;
    const clanXp = currentXp - firstXp;
    
    // Determine correct role based on XP
    let correctRole;
    if (clanXp >= 500000000) correctRole = "zenyte";
    else if (clanXp >= 150000000) correctRole = "onyx";
    else if (clanXp >= 90000000) correctRole = "dragonstone";
    else if (clanXp >= 40000000) correctRole = "diamond";
    else if (clanXp >= 15000000) correctRole = "ruby";
    else if (clanXp >= 8000000) correctRole = "emerald";
    else if (clanXp >= 3000000) correctRole = "sapphire";
    else correctRole = "opal";
    
    // Check if current role includes the correct role
    return !womRole.includes(correctRole);
  }
  
  if (isFighter) {
    // Use safe parsing for EHB
    const ehb = parseInt(member.ehb) || 0;
    
    // Determine correct role based on EHB
    let correctRole;
    if (ehb >= 1500) correctRole = "tzkal";
    else if (ehb >= 1300) correctRole = "monarch";
    else if (ehb >= 1100) correctRole = "senator";
    else if (ehb >= 900) correctRole = "executive";
    else if (ehb >= 700) correctRole = "superior";
    else if (ehb >= 500) correctRole = "supervisor";
    else if (ehb >= 300) correctRole = "leader";
    else if (ehb >= 100) correctRole = "prefect";
    else correctRole = "mentor";
    
    // Check if current role includes the correct role
    return !womRole.includes(correctRole);
  }
  
  return false;
};
