import React, { createContext, useContext, useEffect } from "react";
import useSWR, { SWRConfig } from "swr";
import { supabase } from "../supabaseClient";

// Create the context
const DataContext = createContext();

// Fetcher functions for SWR
const fetchers = {
  // WOM fetchers with edge function fallbacks
  wom: {
    group: async () => {
      try {
        // Try edge function first
        const response = await fetch("/api/wom/group");
        
        // Check content type before attempting to parse JSON
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          console.log("Edge function returned non-JSON response, falling back to direct API");
          console.log("Response status:", response.status);
          // For debugging, log the first 100 chars of the response
          const text = await response.text();
          console.log("Response preview:", text.substring(0, 100));
        }
      } catch (err) {
        console.log("Edge function failed, falling back to direct API:", err.message);
      }
  
      // Fallback to direct API
      const groupId = process.env.REACT_APP_WOM_GROUP_ID || "2928";
      const response = await fetch(
        `https://api.wiseoldman.net/v2/groups/${groupId}?includeMemberships=true`,
        { headers: { "User-Agent": "Siege-Clan-Tracker/1.0" } }
      );
      if (!response.ok) throw new Error(`WOM API error: ${response.status}`);
      return response.json();
    },
  
    competitions: async () => {
      try {
        // Try edge function first
        const response = await fetch("/api/wom/competitions");
        
        // Check content type before attempting to parse JSON
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          console.log("Edge function returned non-JSON response, falling back to direct API");
        }
      } catch (err) {
        console.log("Edge function failed, falling back to direct API:", err.message);
      }
  
      // Fallback to direct API
      const groupId = process.env.REACT_APP_WOM_GROUP_ID || "2928";
      const response = await fetch(
        `https://api.wiseoldman.net/v2/groups/${groupId}/competitions`,
        { headers: { "User-Agent": "Siege-Clan-Tracker/1.0" } }
      );
      if (!response.ok) throw new Error(`WOM API error: ${response.status}`);
      return response.json();
    },
  
    player: async (key, playerId) => {
      try {
        // Try edge function first
        const response = await fetch(`/api/wom/player?id=${playerId}`);
        
        // Check content type before attempting to parse JSON
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          console.log("Edge function returned non-JSON response, falling back to direct API");
        }
      } catch (err) {
        console.log("Edge function failed, falling back to direct API:", err.message);
      }
  
      // Fallback to direct API
      const response = await fetch(
        `https://api.wiseoldman.net/v2/players/${playerId}`,
        { headers: { "User-Agent": "Siege-Clan-Tracker/1.0" } }
      );
      if (!response.ok) throw new Error(`WOM API error: ${response.status}`);
      return response.json();
    },
  },

  // Supabase fetchers
  supabase: {
    members: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },

    users: async (key, options = {}) => {
      const { excludeAdmins = false } = options;

      let query = supabase
        .from("users")
        .select("id, username, created_at, is_admin")
        .order("username");

      if (excludeAdmins) {
        query = query.eq("is_admin", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    events: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    
    // Inside the fetchers.supabase section:
    createEvent: async (eventData) => {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select();
      
      if (error) throw error;
      return data?.[0];
    },
    
    updateEvent: async (eventData) => {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventData.id)
        .select();
      
      if (error) throw error;
      return data?.[0];
    },
    
    deleteEvent: async (eventId) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      return true;
    },
    
    createClaimRequest: async (requestData) => {
      const { data, error } = await supabase
        .from('claim_requests')
        .insert([requestData])
        .select();
      
      if (error) throw error;
      return data?.[0];
    },
    
    getUserPendingRequests: async (userId) => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("claim_requests")
        .select("*, members(name,wom_id)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    
    refreshPlayerWomData: async (womId) => {
      try {
        // First fetch the data from WOM API
        const response = await fetch(`https://api.wiseoldman.net/v2/players/${womId}`, {
          headers: { 'User-Agent': 'Siege-Clan-Tracker/1.0' }
        });
        
        if (!response.ok) {
          throw new Error(`WOM API error: ${response.status}`);
        }
        
        const womData = await response.json();
        
        // Update the member in the database
        const memberData = {
          wom_id: womId,
          first_xp: womData.exp,
          current_xp: womData.exp,
          ehb: womData.ehb || 0,
          level: womData.level || 0,
          current_lvl: womData.level || 0,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase.rpc("admin_upsert_member", {
          member_data: memberData
        });
        
        if (error) throw error;
        return { success: true, data: womData };
      } catch (error) {
        console.error("Error refreshing player WOM data:", error);
        return { success: false, error };
      }
    },

    claimRequests: async (key, options = {}) => {
      const { status } = options;
      
      try {
        // Basic query - no fancy filters or complex query
        let query = supabase.from("claim_requests").select("*");
        
        // Only apply filter if specifically requested
        if (status && status !== 'all' && status !== null) {
          query = query.eq("status", status);
        }
        
        // Order by most recent
        query = query.order("created_at", { ascending: false });
        
        // Execute the query
        const { data: requests, error } = await query;
        
        if (error) throw error;
        if (!requests || requests.length === 0) return [];
    
        // Get usernames for each request
        const userIds = [...new Set(requests
          .filter(req => req.user_id)
          .map(req => req.user_id))];
        
        let userMap = {};
        if (userIds.length > 0) {
          // Get usernames in a separate query
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, username")
            .in("id", userIds);
    
          if (!usersError && users) {
            userMap = users.reduce((map, user) => {
              map[user.id] = user.username;
              return map;
            }, {});
          }
        }
        
        // Add usernames to requests
        return requests.map(request => ({
          ...request,
          username: request.user_id && userMap[request.user_id] 
            ? userMap[request.user_id] 
            : "Unknown User"
        }));
      } catch (err) {
        console.error("Error in claimRequests fetcher:", err);
        return [];
      }
    },
    
    userClaimRequests: async (key, userId) => {
      if (!userId) {
        console.log("userClaimRequests called with null userId");
        return [];
      }
    
      try {
        console.log("Fetching claim requests for user:", userId);
        
        // Simple query with minimal filter
        const { data, error } = await supabase
          .from("claim_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
    
        if (error) throw error;
        console.log(`Found ${data?.length || 0} claim requests for user ${userId}`);
        
        return data || [];
      } catch (err) {
        console.error("Error in userClaimRequests fetcher:", err);
        return [];
      }
    },

    processRequest: async (requestId, status, notes, userId, womId) => {
      try {
        // Update the request status
        const { error: updateError } = await supabase
          .from("claim_requests")
          .update({
            status,
            admin_notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        // If approved, create the player claim
        if (status === "approved" && userId && womId) {
          const { data: existingClaim, error: claimCheckError } = await supabase
            .from("player_claims")
            .select("id")
            .eq("wom_id", womId)
            .single();

          if (claimCheckError && claimCheckError.code !== "PGRST116") {
            throw claimCheckError;
          }

          if (existingClaim) {
            throw new Error("Player has already been claimed by another user");
          }

          const { error: claimError } = await supabase
            .from("player_claims")
            .insert([{ user_id: userId, wom_id: womId }]);

          if (claimError) throw claimError;
        }
      } catch (err) {
        console.error("Error processing request:", err);
        throw err;
      }
    },

    playerGoals: async (key, userId, playerId) => {
      try {
        // Don't proceed if userId is undefined or null
        if (!userId) {
          console.warn(
            "playerGoals called with missing userId for player",
            playerId
          );
          return [];
        }

        // Try the RPC function first
        const { data, error } = await supabase.rpc("get_user_goals", {
          user_id_param: userId,
        });

        // If the function call fails, fall back to direct query
        if (error) {
          console.log("Function error, falling back to direct query:", error);

          const { data: directData, error: directError } = await supabase
            .from("user_goals")
            .select("*")
            .eq("user_id", userId);

          if (directError) {
            console.error("Direct query error:", directError);
            throw directError;
          }

          // Filter for the specific player
          const playerGoals =
            directData?.filter((goal) => goal.wom_id === playerId) || [];
          return playerGoals.sort((a, b) => {
            // Sort by completion status, then goal type, then metric
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.goal_type !== b.goal_type)
              return a.goal_type.localeCompare(b.goal_type);
            return a.metric.localeCompare(b.metric);
          });
        }

        // Filter and sort as before with the function result
        const playerGoals =
          data?.filter((goal) => goal.wom_id === playerId) || [];
        return playerGoals.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          if (a.goal_type !== b.goal_type)
            return a.goal_type.localeCompare(b.goal_type);
          return a.metric.localeCompare(b.metric);
        });
      } catch (err) {
        console.error("Error fetching goals:", err);
        return [];
      }
    },

    playerMetrics: async (key) => {
      const goalType = key[1]; // Get the goal type from the key
      // Return available metrics based on goal type
      let metrics = [];

      if (goalType === "skill") {
        metrics = [
          { metric: "overall", name: "Overall" },
          { metric: "attack", name: "Attack" },
          { metric: "strength", name: "Strength" },
          { metric: "defence", name: "Defence" },
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
        metrics = [
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
          { metric: "obor", name: "Obor" },
          { metric: "sarachnis", name: "Sarachnis" },
          { metric: "scorpia", name: "Scorpia" },
          { metric: "skotizo", name: "Skotizo" },
          { metric: "the_gauntlet", name: "The Gauntlet" },
          { metric: "the_corrupted_gauntlet", name: "The Corrupted Gauntlet" },
          { metric: "theatre_of_blood", name: "Theatre of Blood" },
          {
            metric: "thermonuclear_smoke_devil",
            name: "Thermonuclear Smoke Devil",
          },
          { metric: "tzkal_zuk", name: "TzKal-Zuk" },
          { metric: "tztok_jad", name: "TzTok-Jad" },
          { metric: "venenatis", name: "Venenatis" },
          { metric: "vetion", name: "Vet'ion" },
          { metric: "vorkath", name: "Vorkath" },
          { metric: "zalcano", name: "Zalcano" },
          { metric: "zulrah", name: "Zulrah" },
        ];
      }

      return metrics;
    },

    playerStats: async (key, playerId, goalType, metric) => {
      if (!playerId || !goalType || !metric) return null;

      try {
        // For skills, use player snapshot data
        if (goalType === "skill") {
          const { data, error } = await supabase
            .from("member_snapshots")
            .select("skills")
            .eq("wom_id", playerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;

          if (data && data.skills && data.skills[metric]) {
            return {
              experience: data.skills[metric].experience || 0,
              level: data.skills[metric].level || 1,
              rank: data.skills[metric].rank || 0,
            };
          }
        }

        // For bosses, use player boss data
        if (goalType === "boss") {
          const { data, error } = await supabase
            .from("member_snapshots")
            .select("bosses")
            .eq("wom_id", playerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;

          if (data && data.bosses && data.bosses[metric]) {
            return {
              kills: data.bosses[metric].kills || 0,
              rank: data.bosses[metric].rank || 0,
            };
          }
        }

        return null;
      } catch (err) {
        console.error("Error fetching player stats:", err);
        return null;
      }
    },

    goals: {
      create: async (goalData) => {
        const { data, error } = await supabase
          .from("user_goals")
          .insert([goalData])
          .select()
          .single();

        if (error) throw error;
        return data;
      },

      delete: async (goalId) => {
        const { error } = await supabase
          .from("user_goals")
          .delete()
          .eq("id", goalId);

        if (error) throw error;
        return { success: true };
      },
    },

    availableMembers: async () => {
      try {
        // Get all members
        const { data: allMembers, error: membersError } = await supabase
          .from("members")
          .select("wom_id, name")
          .order("name");

        if (membersError) throw membersError;

        // Get already claimed players
        const { data: claimedPlayers, error: claimsError } = await supabase
          .from("player_claims")
          .select("wom_id");

        if (claimsError) throw claimsError;

        // Get pending claim requests
        const { data: pendingRequests, error: pendingError } = await supabase
          .from("claim_requests")
          .select("wom_id")
          .eq("status", "pending");

        if (pendingError) throw pendingError;

        // Create sets of claimed and pending request IDs
        const claimedIds = new Set(claimedPlayers.map((p) => p.wom_id));
        const pendingIds = new Set(pendingRequests.map((p) => p.wom_id));

        // Filter out both claimed players and those with pending requests
        const available = allMembers.filter(
          (m) => !claimedIds.has(m.wom_id) && !pendingIds.has(m.wom_id)
        );

        return available || [];
      } catch (err) {
        console.error("Error fetching available members:", err);
        throw err;
      }
    },

    updateMember: async (memberData) => {
      const { data, error } = await supabase.rpc("admin_upsert_member", {
        member_data: memberData,
      });

      if (error) throw error;
      return data || memberData;
    },

    whitelistRunewatchMember: async (womId, reason) => {
      const { error } = await supabase
        .from("members")
        .update({
          runewatch_whitelisted: true,
          runewatch_whitelist_reason: reason,
          runewatch_whitelisted_at: new Date().toISOString(),
        })
        .eq("wom_id", womId);
      
      if (error) throw error;
      return true;
    },
    
    deleteMember: async (womId) => {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("wom_id", womId);
      
      if (error) throw error;
      return true;
    },
  },
};

// Main provider component
export function DataProvider({ children }) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // Only refetch on demand or when component mounts
        revalidateOnFocus: false, // Don't refetch when window gains focus
        dedupingInterval: 5000, // Deduplicate requests that happen within 5 seconds
        suspense: false, // Don't use React Suspense
        errorRetryInterval: 10000, // Retry failed requests after 10 seconds
        onError: (error) => {
          console.error("SWR error:", error);
        },
      }}
    >
      <DataContext.Provider value={{ fetchers }}>
        {children}
      </DataContext.Provider>
    </SWRConfig>
  );
}

// Base hook for accessing the context
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// Specialized hooks for various data types
export function useWomGroup() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR("womGroup", fetchers.wom.group, {
    revalidateOnFocus: false,
    refreshInterval: 300000, // 5 minutes
  });

  return {
    groupData: data,
    loading: !error && !data,
    error,
    refreshData: mutate,
  };
}

export function useWomCompetitions() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR(
    "womCompetitions",
    fetchers.wom.competitions,
    {
      revalidateOnFocus: false,
      refreshInterval: 1800000, // 30 minutes
    }
  );

  return {
    competitions: data,
    loading: !error && !data,
    error,
    refreshData: mutate,
  };
}

// Combine the two above for backward compatibility
export function useWomData() {
  const {
    groupData,
    loading: groupLoading,
    error: groupError,
    refreshData: refreshGroup,
  } = useWomGroup();
  const {
    competitions,
    loading: compLoading,
    error: compError,
    refreshData: refreshComp,
  } = useWomCompetitions();

  const refreshData = () => {
    refreshGroup();
    refreshComp();
  };

  return {
    groupData,
    competitions,
    loading: groupLoading || compLoading,
    error: groupError || compError,
    refreshData,
  };
}

export function useMembers() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR("members", fetchers.supabase.members, {
    revalidateOnFocus: false,
    refreshInterval: 600000, // 10 minutes
  });

  return {
    members: data,
    loading: !error && !data,
    error,
    refreshMembers: mutate,
  };
}

export function useUsers(options = {}) {
  const { fetchers } = useData();
  const { excludeAdmins } = options;
  const key = `users-${excludeAdmins ? "no-admins" : "all"}`;

  const { data, error, mutate } = useSWR(
    [key, { excludeAdmins }],
    fetchers.supabase.users,
    {
      revalidateOnFocus: false,
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    users: data,
    loading: !error && !data,
    error,
    refreshUsers: mutate,
  };
}

export function useEvents() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR("events", fetchers.supabase.events, {
    revalidateOnFocus: false,
    refreshInterval: 300000, // 5 minutes
  });

  return {
    events: data,
    loading: !error && !data,
    error,
    refreshEvents: mutate,
  };
}

export function useClaimRequests(options = { status: "all" }) {
  const { fetchers } = useData();
  const { status } = options;
  const key = `claim-requests-${status}`;

  const { data, error, mutate } = useSWR(
    [key, { status }],
    fetchers.supabase.claimRequests,
    {
      revalidateOnFocus: false,
      refreshInterval: 120000, // 2 minutes
    }
  );

  return {
    requests: data,
    loading: !error && !data,
    error,
    refreshRequests: mutate,
  };
}

export function usePlayerGoals(userId, playerId) {
  const { fetchers } = useData();

  const key = userId && playerId ? `player-goals-${userId}-${playerId}` : null;

  // Only attempt to fetch data if both userId and playerId are present
  const { data, error, mutate } = useSWR(
    key, // This will be null if either param is missing
    key ? () => fetchers.supabase.playerGoals(key, userId, playerId) : null
  );

  // By having the check here, we avoid the warning logs
  useEffect(() => {
    if (!userId && playerId) {
      console.warn(`usePlayerGoals: userId missing for playerId ${playerId}`);
    }
  }, [userId, playerId]);

  return {
    goals: data || [],
    loading: !error && !data && userId && playerId,
    error: !userId && playerId ? new Error("Missing user ID") : error,
    refreshGoals: mutate,
    deleteGoal: async (goalId) => {
      try {
        if (!userId) {
          console.error("Cannot delete goal: No user ID available");
          return { success: false, error: new Error("No user ID available") };
        }

        await fetchers.supabase.goals.delete(goalId);
        mutate(
          data?.filter((goal) => goal.id !== goalId),
          false
        );
        return { success: true };
      } catch (err) {
        console.error("Error deleting goal:", err);
        mutate();
        return { success: false, error: err };
      }
    },
  };
}

export function usePlayerMetrics(goalType) {
  const { fetchers } = useData();
  const { data, error } = useSWR(
    goalType ? ["player-metrics", goalType] : null,
    fetchers.supabase.playerMetrics
  );

  return {
    metrics: data || [],
    loading: !error && !data && goalType,
    error,
  };
}

export function usePlayerStats(playerId, goalType, metric) {
  const { fetchers } = useData();
  const key = `player-stats-${playerId}-${goalType}-${metric}`;

  const { data, error, mutate } = useSWR(
    playerId && goalType && metric ? [key, playerId, goalType, metric] : null,
    fetchers.supabase.playerStats
  );

  return {
    stats: data,
    loading: !error && data === undefined && playerId && goalType && metric,
    error,
    refreshStats: mutate,
  };
}

export function useGoals() {
  const { fetchers } = useData();

  const createGoal = async (goalData) => {
    return await fetchers.supabase.goals.create(goalData);
  };

  return {
    createGoal,
    loading: false, // No loading state for this hook as it doesn't fetch data
  };
}

export function useAvailableMembers() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR(
    "availableMembers",
    fetchers.supabase.availableMembers,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    members: data || [],
    loading: !error && !data,
    error,
    refreshAvailableMembers: mutate,
  };
}

export function useUserClaimRequests(userId) {
  const { fetchers } = useData();
  const key = userId ? `user-claim-requests-${userId}` : null;

  const { data, error, mutate } = useSWR(
    key,
    key ? () => fetchers.supabase.userClaimRequests(key, userId) : null,
    {
      revalidateOnFocus: false,
      refreshInterval: 180000, // 3 minutes
    }
  );

  return {
    requests: data || [],
    loading: !error && !data && userId,
    error: !userId ? null : error,
    refreshRequests: mutate,
  };
}

export function useMembersAdmin() {
  const { fetchers } = useData();
  const { data, error, mutate } = useSWR("members", fetchers.supabase.members);

  const updateMember = async (memberData) => {
    try {
      const result = await fetchers.supabase.updateMember(memberData);
      mutate(); // Refresh the members cache
      return { success: true, data: result };
    } catch (err) {
      console.error("Error updating member:", err);
      return { success: false, error: err };
    }
  };

  return {
    members: data || [],
    loading: !error && !data,
    error,
    refreshMembers: mutate,
    updateMember,
  };
}

// For consistency with previous patterns, export these aliases
export const useMembersData = useMembers;
export const useUsersData = useUsers;
