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
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: passwordHash // Use the same password hash
          });
      
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
        // CRITICAL: Create a proper Supabase session
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: `${username.trim().toLowerCase()}@example.com`,
          password: password
        });
        
        if (authError) {
          console.warn("Supabase auth error, trying to create session:", authError);
        }
        
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

      // Get auth token from session - required for edge function authentication
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Missing Supabase session token for admin request');
      }

      const authHeaders = {
        'Authorization': `Bearer ${session.access_token}`
      };

      // Call Netlify edge function instead of direct Supabase
      const response = await fetch('/.netlify/functions/admin-toggle-user-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          isAdmin: makeAdmin
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error updating admin status:", error);
        return { error: error.error || "Failed to update admin status" };
      }

      const result = await response.json();
      console.log("Edge function admin update response:", result);

      return { success: true, data: result.data };
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
    console.log("User ID type:", typeof userId);
    try {
      // Use the RPC function that's working correctly
      const { data: claimsData, error: claimsError } = await supabase.rpc(
        "get_user_claims",
        {
          user_id_param: userId,
        }
      );

      console.log("Claims query result:", { claimsData, claimsError });

      if (claimsError) {
        console.error("Claims fetch error:", claimsError);
        throw claimsError;
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
  
      // Hash password
      const passwordHash = await sha256(password);
      
      // Create user record
      const { error } = await supabase
        .from("users")
        .insert([
          {
            id: authData.user.id,
            username: username.trim().toLowerCase(),
            password_hash: passwordHash,
            // Links the row to the auth account. validateAuth() in
            // netlify/functions/utils/adminHelpers.cjs looks admins up by this
            // column, so a row without it can never be promoted to admin.
            supabase_auth_id: authData.user.id,
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
      localStorage.setItem("userId", authData.user.id);
      localStorage.setItem("user", JSON.stringify({
        id: authData.user.id,
        username: username.trim().toLowerCase(),
        is_admin: false,
        created_at: created_at,
        join_date: created_at,
      }));
      
      setUser({
        id: authData.user.id,
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
      // One server-side call. The browser has no read or write access to
      // claim_codes or player_claims, and cannot be given any: a SELECT policy
      // loose enough to look up your own code by value would also let anyone
      // list every unredeemed code. The function also serialises concurrent
      // redemptions, which the previous six-step client-side version did not.
      const { data, error } = await supabase.rpc("redeem_claim_code", {
        p_code: code,
      });

      if (error) {
        console.error("Error redeeming claim code:", error);
        return { error: "Failed to process claim" };
      }

      if (!data?.success) {
        return { error: data?.error || "Failed to claim player" };
      }

      // Refresh user claims
      await fetchUserClaims(user.id);

      return {
        success: true,
        message: `Successfully claimed player: ${data.player_name}`,
        player: { name: data.player_name },
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
