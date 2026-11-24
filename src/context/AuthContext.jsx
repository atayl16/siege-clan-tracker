import { createContext, useContext, useState, useEffect } from "react";
import { sha256 } from "crypto-hash";
import { supabase } from "../supabaseClient";
import { reloadPage } from "../utils/reloadPage";
import { normaliseUsername, signupUsernameProblem } from "../utils/username";

const AuthContext = createContext();

// How long signing out waits for Supabase before clearing its session itself.
const SIGN_OUT_WAIT_MS = 5000;

// The last sign-out, including clearing this browser's copy of the member.
// Signing in or up waits for it first: finishing late, it would remove the
// new member's session and details. One whose Supabase call never answers is
// dropped by reloading the page (see logout).
let pendingSignOut = Promise.resolve();

class SignOutTimeout extends Error {}

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new SignOutTimeout(`no answer in ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/** Remove Supabase's stored sessions (sb-<project>-auth-token and its parts). */
export function removeStoredSupabaseSessions(storage = localStorage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (/^sb-.+-auth-token/.test(key)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

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

      // The built-in admin (removed 2026-11-24) stored a made-up user with id
      // "admin" and no userId. A browser still holding one would otherwise
      // stay on the admin screens with nothing behind them, so sign it out.
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem("user"));
      } catch {
        // Unreadable: the checks below treat it as nothing stored.
      }
      if (stored?.id === "admin" && !localStorage.getItem("userId")) {
        await logout();
        setLoading(false);
        return;
      }

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

  // Sign in
  const login = async (username, password) => {
    await pendingSignOut;
    try {
      // "Test user" signs in to the account stored as "test_user" (see
      // utils/username.js). There is no built-in admin any more: admins are
      // ordinary accounts with is_admin set.
      const name = normaliseUsername(username);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", name)
        .single();
  
      if (error) {
        return { error: "Invalid credentials" };
      }
  
      // Verify password
      const inputPasswordHash = await sha256(password);
      if (data.password_hash === inputPasswordHash) {
        // CRITICAL: Create a proper Supabase session
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: `${name}@example.com`,
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
        .select("wom_id, name, current_lvl, ehb, siege_score, alt")
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
    // Spaces become underscores: the name is also the auth email's local
    // part, which cannot hold a space (see utils/username.js).
    const name = normaliseUsername(username);
    const problem = signupUsernameProblem(name);
    if (problem) return { error: problem };
    await pendingSignOut;

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", name)
        .single();
  
      if (existingUser) {
        return { error: "Username already taken" };
      }
  
      // First create the user in auth system
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${name}@example.com`,
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
            username: name,
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
        username: name,
        is_admin: false,
        created_at: created_at,
        join_date: created_at,
      }));
      
      setUser({
        id: authData.user.id,
        username: name,
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

  // Signing in or up waits for the whole of this, cleanup included (see
  // pendingSignOut). Waiting only for Supabase's answer let the cleanup run
  // after a quick new sign-in and sign that member out again.
  const logout = () => {
    const run = signOutAndClear();
    pendingSignOut = run.catch(() => {});
    return run;
  };

  const signOutAndClear = async () => {
    // End the Supabase session before showing the visitor as signed out.
    // Without this its token stayed in the browser, so on a shared computer
    // the next person was still signed in to the database as the previous
    // member. Local scope removes this browser's session before the network
    // request that revokes it, so it goes even offline, and other devices stay
    // signed in. An error can come from that revocation after the removal
    // succeeded, so it is logged, not treated as a failed sign-out.
    let stuck = false;
    try {
      const signOut = supabase.auth.signOut({ scope: "local" });
      const { error } = (await withTimeout(signOut, SIGN_OUT_WAIT_MS)) || {};
      if (error) console.warn("Supabase sign-out:", error);
    } catch (err) {
      stuck = err instanceof SignOutTimeout;
      console.warn("Supabase sign-out failed:", err);
    }
    // Whatever happened above, no Supabase session is left in this browser.
    removeStoredSupabaseSessions();
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("useServiceRole"); // left by the removed built-in admin
    setIsAuthenticated(false);
    setUser(null);
    setUserClaims([]);
    // A sign-out that never answered would hold up the next sign-in for good,
    // or remove its session if it finished after it. Reloading drops it; the
    // stored session is already gone, so the new page starts signed out.
    if (stuck) reloadPage();
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
