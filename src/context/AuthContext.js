import { createContext, useContext, useState, useEffect } from "react";
import { sha256 } from "crypto-hash";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

// Keep hardcoded admin for emergency access
const ADMIN_EMAIL_HASH =
  "8c91a3d71da50b56d355e4b61ff793842befb82bd5972e3b0d84fb771e450428";
const ADMIN_PASSWORD_HASH =
  "86c671c7a776b62f925b5d2387fae4c73392931be4d37b19e37e5534abab587d";

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState([]);

  // Load user session on initial render
  useEffect(() => {
    const checkSession = async () => {
      if (localStorage.getItem("userId")) {
        try {
          const userId = localStorage.getItem("userId");
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId) // This now works with UUID
            .single();

          if (data && !error) {
            setUser(data);
            // Set isAuthenticated to true if the user has admin privileges
            if (data.is_admin) {
              setIsAuthenticated(true);
              localStorage.setItem("adminAuth", "true");
            }
            fetchUserClaims(data.id);
          } else {
            logout();
          }
        } catch (err) {
          console.error("Session check error:", err);
          logout();
        }
      }

      setLoading(false);
    };

    checkSession();
  }, []);

  // Admin login
  const login = async (username, password) => {
    try {
      // Hash the provided credentials
      const usernameHash = await sha256(username.trim().toLowerCase());
      const passwordHash = await sha256(password);

      // Try admin login first
      if (
        usernameHash === ADMIN_EMAIL_HASH &&
        passwordHash === ADMIN_PASSWORD_HASH
      ) {
        localStorage.setItem("adminAuth", "true");
        setIsAuthenticated(true);
        return { success: true, isAdmin: true };
      }

      // If not hardcoded admin, try regular user login
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username.trim().toLowerCase())
        .single();

      if (error) {
        return { error: "Invalid credentials" };
      }

      // Verify password
      const inputPasswordHash = await sha256(password);
      if (data.password_hash === inputPasswordHash) {
        localStorage.setItem("userId", data.id);
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);

        // If user has admin privileges, set isAuthenticated to true
        if (data.is_admin) {
          setIsAuthenticated(true);
          localStorage.setItem("adminAuth", "true");
        }

        fetchUserClaims(data.id);
        return { success: true, isAdmin: data.is_admin || false };
      }

      return { error: "Invalid credentials" };
    } catch (error) {
      console.error("Authentication error:", error);
      return { error: "Authentication failed" };
    }
  };

  // Add a function to promote/demote admin users  
  const toggleAdminStatus = async (userId, makeAdmin) => {
    try {
      console.log(`Updating user ${userId} to admin status: ${makeAdmin}`);
      
      // For master admin, we'll need to use a different approach
      // since we can't use headers() method
      
      // Update the user record in the database
      const { data, error } = await supabase
        .from("users")
        .update({ is_admin: makeAdmin })
        .eq("id", userId)
        .select();
  
      if (error) {
        console.error("Error updating admin status:", error);
        return { error: error.message || "Failed to update admin status" };
      }
      
      console.log("Admin update response:", data);
      
      // Verify the update was successful
      if (!data || data.length === 0) {
        console.error("No rows were updated");
        
        // Special handling for master admin
        if (localStorage.getItem("adminAuth") === "true") {
          // Try a direct SQL approach for master admin
          const { error: directError } = await supabase
            .rpc('admin_set_user_admin_status', { 
              target_user_id: userId,
              is_admin_value: makeAdmin 
            });
            
          if (directError) {
            console.error("Direct admin update failed:", directError);
            return { error: directError.message };
          }
          
          return { success: true };
        }
        
        return { error: "No changes were made" };
      }
      
      return { success: true, data: data[0] };
    } catch (error) {
      console.error("Error toggling admin status:", error);
      return { error: "Failed to update admin status: " + error.message };
    }
  };
  
  // Make sure this function is included in your exported context
  
  // Link a user to a specific Supabase Auth ID (for admin users)
  const linkUserToSupabaseAuth = async (userId, supabaseAuthId) => {
    try {
      // Validate the UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(supabaseAuthId)) {
        return { error: "Invalid UUID format" };
      }
  
      // Update the user record with the Supabase Auth ID
      const { error } = await supabase
        .from("users")
        .update({ supabase_auth_id: supabaseAuthId })
        .eq("id", userId);
  
      if (error) {
        console.error("Error linking user to Supabase Auth:", error);
        return { error: error.message || "Failed to link user" };
      }
  
      return { success: true };
    } catch (error) {
      console.error("Error linking user to Supabase Auth:", error);
      return { error: "Failed to link user: " + error.message };
    }
  };

  const fetchUserRequestsCount = async (userId) => {
    if (!userId) return 0;

    try {
      // Make sure claim_requests table has user_id as UUID
      const { error, count } = await supabase
        .from("claim_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error("Error fetching user requests count:", err);
      return 0;
    }
  };

  // Fetch a user's claimed players
  const fetchUserClaims = async (userId) => {
    try {
      // First fetch the user's claims
      // player_claims table needs user_id as UUID
      const { data: claimsData, error: claimsError } = await supabase
        .from("player_claims")
        .select("id, wom_id, claimed_at")
        .eq("user_id", userId);

      if (claimsError) {
        console.error("Error fetching claims:", claimsError);
        return;
      }

      if (!claimsData || claimsData.length === 0) {
        setUserClaims([]);
        return;
      }

      // Get the member details
      const womIds = claimsData.map((claim) => claim.wom_id);

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("wom_id, name, current_lvl, ehb, siege_score")
        .in("wom_id", womIds);

      if (membersError) {
        console.error("Error fetching member details:", membersError);
        return;
      }

      // Create a map for quick lookups
      const membersMap = {};
      membersData.forEach((member) => {
        membersMap[member.wom_id] = member;
      });

      // Combine the data
      const combinedClaims = claimsData.map((claim) => ({
        ...claim,
        members: membersMap[claim.wom_id] || {
          name: "Unknown Player",
          title: null, // Default title value
          current_lvl: 3,
          ehb: 0,
          siege_score: 0,
        },
      }));

      setUserClaims(combinedClaims);
    } catch (err) {
      console.error("Failed to fetch user claims:", err);
    }
  };

  // Register a new user
  const register = async (username, password) => {
    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.trim().toLowerCase())
        .single();
  
      if (existingUser) {
        return { error: "Username already taken" };
      }
  
      // First create the user in auth system
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${username.trim().toLowerCase()}@example.com`,
        password: password,
      });
  
      if (authError) {
        console.error("Auth registration error:", authError);
        return { error: authError.message || "Registration failed" };
      }
  
      // Hash password - use a different method to ensure it works
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log("Generated hash:", passwordHash);
  
      // Try RPC call instead of direct insert to bypass RLS issues
      const { error: rpcError } = await supabase.rpc('create_user', {
        user_id: authData.user.id,
        user_name: username.trim().toLowerCase(),
        user_password_hash: passwordHash,
        is_user_admin: false
      });
  
      if (rpcError) {
        console.error("RPC error:", rpcError);
        
        // Fallback to direct insert if RPC fails
        const { error } = await supabase
          .from("users")
          .insert([
            {
              id: authData.user.id,
              username: username.trim().toLowerCase(),
              password_hash: passwordHash,
              is_admin: false,
            },
          ])
          .select();
          
        if (error) {
          console.error("Insert error:", error);
          return { error: error.message || "Registration failed" };
        }
        
        // After successful direct insert:
        const created_at = new Date().toISOString();
        
        localStorage.setItem("userId", authData.user.id);
        localStorage.setItem("user", JSON.stringify({
          id: authData.user.id,
          username: username.trim().toLowerCase(),
          is_admin: false,
          created_at: created_at
        }));
        setUser({
          id: authData.user.id,
          username: username.trim().toLowerCase(),
          is_admin: false,
          created_at: created_at
        });
        
        return { success: true };
      }
      
      // After successful RPC call - need to add created_at here too!
      const created_at = new Date().toISOString();
      
      localStorage.setItem("userId", authData.user.id);
      localStorage.setItem("user", JSON.stringify({
        id: authData.user.id,
        username: username.trim().toLowerCase(),
        is_admin: false,
        created_at: created_at  // Add this line
      }));
      setUser({
        id: authData.user.id,
        username: username.trim().toLowerCase(),
        is_admin: false,
        created_at: created_at  // Add this line
      });
  
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { error: "Registration failed: " + error.message };
    }
  };

  // Claim a player using a code
  const claimPlayer = async (code) => {
    if (!user) return { error: "You must be logged in to claim a player" };

    try {
      // Verify the claim code
      const { data: codeData, error: codeError } = await supabase
        .from("claim_codes")
        .select("*")
        .eq("code", code)
        .eq("is_claimed", false)
        .single();

      if (codeError || !codeData) {
        return { error: "Invalid or already used claim code" };
      }

      // Check if code is expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return { error: "This claim code has expired" };
      }

      // Check if player is already claimed
      const { data: existingClaim } = await supabase
        .from("player_claims")
        .select("*")
        .eq("wom_id", codeData.wom_id)
        .single();

      if (existingClaim) {
        return { error: "This player has already been claimed" };
      }

      // Get player info - ensure wom_id is handled correctly
      let womId = codeData.wom_id;
      
      // Convert if needed (depends on your wom_id type in members table)
      if (typeof womId === "string" && !isNaN(womId)) {
        womId = parseInt(womId, 10);
      }

      const { data: playerData, error: playerError } = await supabase
        .from("members")
        .select("name")
        .eq("wom_id", womId)
        .single();

      let playerName = "Unknown Player";

      if (playerError) {
        console.warn("Player not found in members table:", playerError);
      } else if (playerData) {
        playerName = playerData.name;
      }

      // Create new claim using the wom_id from the claim code
      // user.id is now a UUID
      const { error: insertError } = await supabase
        .from("player_claims")
        .insert([
          {
            user_id: user.id, // This is now a UUID
            wom_id: codeData.wom_id,
          },
        ]);

      if (insertError) {
        console.error("Error inserting player claim:", insertError);
        return { error: "Failed to claim player" };
      }

      // Mark code as claimed
      const { error: updateError } = await supabase
        .from("claim_codes")
        .update({ is_claimed: true })
        .eq("id", codeData.id);

      if (updateError) {
        console.error("Error marking code as claimed:", updateError);
      }

      // Refresh user claims
      await fetchUserClaims(user.id);

      return {
        success: true,
        message: `Successfully claimed player: ${playerName}`,
        player: { name: playerName },
      };
    } catch (err) {
      console.error("Error claiming player:", err);
      return { error: "Failed to process claim" };
    }
  };

  const logout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    setUserClaims([]);
  };

  const isAdmin = () => {
    return isAuthenticated;
  };

  const isLoggedIn = () => {
    return isAuthenticated || user !== null;
  };

  const isLoggedOut = () => {
    return !isAuthenticated && user === null;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        userClaims,
        loading,
        login,
        logout,
        register,
        claimPlayer,
        isAdmin,
        isLoggedIn,
        isLoggedOut,
        fetchUserClaims,
        fetchUserRequestsCount,
        toggleAdminStatus,
        linkUserToSupabaseAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
