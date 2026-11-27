import { formatNumber } from "./numbers.js";

// Rank name definitions
export const SKILLER_RANK_NAMES = ["Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte", "Maxed"];
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
  { name: "Zenyte", color: "orange", range: [500000000, Infinity], description: "500,000,000 XP" },
  { name: "Maxed", color: "red", range: null, description: "2,376 Total Level" }
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
  return formatNumber(value);
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

    // Filter out special ranks (like Maxed) that don't have XP-based ranges
    const xpBasedRanks = SKILLER_RANKS.filter(rank => rank.range !== null);

    // Find which rank range the member is in
    for (let i = 0; i < xpBasedRanks.length; i++) {
      const rank = xpBasedRanks[i];
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        // Check if this is the last XP-based rank (max rank)
        if (i === xpBasedRanks.length - 1) {
          return 0; // Already at max rank
        }
        // Return the XP needed to reach the next rank
        return rank.range[1] - clanXp;
      }
    }

    // If they're at the highest XP-based rank already
    if (xpBasedRanks.length > 0 && clanXp >= xpBasedRanks[xpBasedRanks.length - 1].range[0]) {
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
    // Filter out special ranks (like Maxed) that don't have XP-based ranges
    const xpBasedRanks = SKILLER_RANKS.filter(rank => rank.range !== null);

    // Find the appropriate skiller rank based on XP
    for (const rank of xpBasedRanks) {
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        appropriateRank = rank.name;
        break;
      }
    }
    // If they're at max XP, give them the highest XP-based rank
    if (xpBasedRanks.length > 0 && clanXp >= xpBasedRanks[xpBasedRanks.length - 1].range[0]) {
      appropriateRank = xpBasedRanks[xpBasedRanks.length - 1].name;
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

/**
 * The rank a member should be moved UP to, or null when there is none.
 *
 * Ranks only ever go up. A fighter's EHB can fall without them doing
 * anything, when Wise Old Man changes a boss's EHB rate, and that must not
 * suggest moving them back down a rank they earned. So a member whose
 * EHB (or clan XP, for skillers) now falls short of their current rank is
 * treated as correctly ranked; a demotion is an admin's decision, made by
 * hand.
 *
 * Maxed is awarded for total level, not XP, so it is never moved.
 *
 * @returns {{ rank: string, type: "skiller" | "fighter" } | null}
 *   rank in lowercase, as in womrole
 */
export const rankPromotionFor = (member) => {
  const womRole = String(member?.womrole || "").toLowerCase();
  if (!womRole || womRole.includes("maxed")) return null;

  const paths = [
    {
      type: "skiller",
      ranks: SKILLER_RANKS.filter((rank) => rank.range !== null),
      value: safeParseInt(member.current_xp) - safeParseInt(member.first_xp),
    },
    { type: "fighter", ranks: FIGHTER_RANKS, value: Number(member.ehb) || 0 },
  ];

  for (const { type, ranks, value } of paths) {
    const current = ranks.findIndex((rank) => womRole.includes(rank.name.toLowerCase()));
    if (current === -1) continue;

    let earned = 0;
    ranks.forEach((rank, i) => {
      if (value >= rank.range[0]) earned = i;
    });
    return earned > current ? { rank: ranks[earned].name.toLowerCase(), type } : null;
  }
  return null;
};

export const memberNeedsRankUpdate = (member) => {
  // Skip hidden members, former members, and those with missing wom_id
  if (!member || member.hidden || member.left_date || !member.wom_id) {
    return false;
  }
  return rankPromotionFor(member) !== null;
};
