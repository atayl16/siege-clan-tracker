import { createContext, useContext, useState, useEffect } from "react";
import { sha256 } from "crypto-hash";
import { supabase } from "../supabaseClient";
import { v4 as uuidv4 } from "uuid";

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
      // Try to restore session from storage
      await supabase.auth.getSession();

      // Then proceed with your existing code...
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
      if (usernameHash === ADMIN_EMAIL_HASH && passwordHash === ADMIN_PASSWORD_HASH) {
        localStorage.setItem("adminAuth", "true");
        // Add the flag for service role access
        localStorage.setItem("useServiceRole", "true");
        setIsAuthenticated(true);
      
        // Create a mock admin user for UI purposes
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: "admin",
            username: "admin",
            is_admin: true,
            created_at: new Date().toISOString(),
          })
        );
      
        setUser({
          id: "admin",
          username: "admin",
          is_admin: true,
        });
      
        // NEW CODE: Try to create a Supabase auth session for the admin
        try {
          // First check if we have a pre-configured admin account
          const adminEmail = "admin@siegeclan.org"; // Use consistent email
      
          if (signInError) {
            console.log("Admin auth not found, creating...");
            // If sign-in fails, try to create the account
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: adminEmail,
              password: passwordHash
            });
      
            if (!signUpError) {
              console.log("Admin auth created successfully");
            } else {
              console.error("Failed to create admin auth:", signUpError);
            }
          } else {
            console.log("Admin authenticated with Supabase");
          }
          
          // Now call the function to register this user as admin
          const { error: rpcError } = await supabase.rpc('register_admin_user');
          if (rpcError) {
            console.error("Error registering admin in database:", rpcError);
          } else {
            console.log("Admin registered in database successfully");
          }
        } catch (authError) {
          console.error("Error setting up admin authentication:", authError);
          // Continue anyway - the hard-coded admin should still work
        }
      
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
      
      // First update the users table
      const { data, error } = await supabase
        .from("users")
        .update({ is_admin: makeAdmin })
        .eq("id", userId)
        .select();
  
      if (error) {
        console.error("Error updating admin status in users table:", error);
        return { error: error.message || "Failed to update admin status" };
      }
      
      // Now update the admins table
      if (makeAdmin) {
        // Add to admins table if promoting
        const { error: insertError } = await supabase
          .from("admins")
          .insert([{ id: userId }])
          .select();
          
        if (insertError) {
          console.error("Error adding to admins table:", insertError);
          return { error: insertError.message || "Failed to add admin record" };
        }
      } else {
        // Remove from admins table if demoting
        const { error: deleteError } = await supabase
          .from("admins")
          .delete()
          .eq("id", userId);
          
        if (deleteError) {
          console.error("Error removing from admins table:", deleteError);
          return { error: deleteError.message || "Failed to remove admin record" };
        }
      }
      
      return { success: true, data: data[0] };
    } catch (error) {
      console.error("Error toggling admin status:", error);
      return { error: "Failed to update admin status: " + error.message };
    }
  };
  
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
    console.log("Fetching claims for user ID:", userId);
    
    if (!userId) {
      console.log("No user ID provided for fetching claims");
      setUserClaims([]);
      return;
    }
    
    try {
      // Query directly without using RPC
      const { data: claimsData, error: claimsError } = await supabase
        .from("members")
        .select("wom_id, name, current_lvl, ehb, siege_score, updated_at, claimed_by")
        .eq("claimed_by", userId);
  
      console.log("Claims query result:", { claimsData, claimsError });
  
      if (claimsError) {
        console.error("Claims fetch error:", claimsError);
        setUserClaims([]);
        return;
      }
  
      if (!claimsData || claimsData.length === 0) {
        setUserClaims([]);
        return;
      }
  
      // Transform the data to match expected format
      const transformedClaims = claimsData.map(member => ({
        wom_id: member.wom_id,
        user_id: member.claimed_by,
        claimed_at: member.updated_at,
        members: {
          name: member.name,
          current_lvl: member.current_lvl,
          ehb: member.ehb,
          siege_score: member.siege_score,
          wom_id: member.wom_id
        }
      }));
  
      setUserClaims(transformedClaims);
    } catch (err) {
      console.error("Failed to fetch user claims:", err);
      setUserClaims([]);
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
  
      // Generate a new UUID for the user
      const userId = uuidv4();
      
      // Hash password
      const passwordHash = await sha256(password);
      
      // Create user record with the generated UUID
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            id: userId,
            username: username.trim().toLowerCase(),
            password_hash: passwordHash,
            is_admin: false,
          },
        ])
        .select();
        
      if (error) {
        console.error("User record creation error:", error);
        return { error: "Failed to create user record" };
      }
      
      // Set created_at timestamp
      const created_at = new Date().toISOString();
      
      // Store user in local storage and state
      localStorage.setItem("userId", userId);
      localStorage.setItem("user", JSON.stringify({
        id: userId,
        username: username.trim().toLowerCase(),
        is_admin: false,
        created_at: created_at,
        join_date: created_at,
      }));
      
      setUser({
        id: userId,
        username: username.trim().toLowerCase(),
        is_admin: false,
        created_at: created_at,
        join_date: created_at,
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
    localStorage.removeItem("useServiceRole");
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
