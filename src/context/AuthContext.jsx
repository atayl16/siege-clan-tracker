import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Authentication context for managing user sessions and admin access.
 *
 * Uses Supabase Auth as the single source of truth for authentication.
 * Provides user state, admin status, and authentication methods to the entire app.
 *
 * @example
 * const { user, isAdmin, login, logout } = useAuth();
 */
const AuthContext = createContext();

/**
 * Authentication provider component that wraps the application.
 *
 * Manages:
 * - User session state and persistence
 * - Admin authentication flags
 * - Supabase Auth session lifecycle
 * - User claims and profile data
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component with auth context
 */
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState([]);

  // Helper function to clear session data
  const clearSession = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("useServiceRole");
    setUser(null);
    setIsAuthenticated(false);
  };

  // Load user session on initial render
  useEffect(() => {
    const checkSession = async () => {
      // Try to restore session from storage
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse?.data?.session;
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
            // Session invalid - clear everything
            clearSession();
          }
        } catch (err) {
          console.error("Session check error:", err);
          // Clear invalid session
          clearSession();
        }
      } else if (session) {
        // Try to restore from Supabase session
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", session.user.email)
            .single();

          if (data && !error) {
            setUser(data);
            localStorage.setItem("userId", data.id);
            if (data.is_admin) {
              setIsAuthenticated(true);
              localStorage.setItem("adminAuth", "true");
            }
            fetchUserClaims(data.id);
          }
        } catch (err) {
          console.error("Session restoration error:", err);
        }
      } else {
        // No userId - clear any stale data
        clearSession();
      }

      setLoading(false);
    };

    checkSession();

    // Listen for auth state changes (only if available)
    if (supabase.auth.onAuthStateChange) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          // User logged in via Supabase Auth
          try {
            const { data, error } = await supabase
              .from("users")
              .select("*")
              .eq("email", session.user.email)
              .single();

            if (data && !error) {
              setUser(data);
              localStorage.setItem("userId", data.id);
              if (data.is_admin) {
                setIsAuthenticated(true);
                localStorage.setItem("adminAuth", "true");
              }
              fetchUserClaims(data.id);
            }
          } catch (err) {
            console.error("Auth state change error:", err);
          }
        } else {
          clearSession();
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  /**
   * Authenticates a user with username and password.
   *
   * Converts username to email format (username@siege-clan.com) and authenticates
   * via Supabase Auth. On success, fetches user record and sets admin flags.
   *
   * @param {string} username - Username or email to authenticate
   * @param {string} password - User's password
   * @returns {Promise<{success?: boolean, isAdmin?: boolean, error?: string}>}
   *          Success object with admin flag, or error object
   *
   * @example
   * const result = await login('myusername', 'mypassword');
   * if (result.success) {
   *   console.log('Logged in as admin:', result.isAdmin);
   * }
   */
  const login = async (username, password) => {
    try {
      const usernameInput = username.trim().toLowerCase();

      // Convert username to email format (Supabase Auth requires emails)
      const email = usernameInput.includes("@")
        ? usernameInput
        : `${usernameInput}@siege-clan.com`;

      // Authenticate with Supabase Auth (single source of truth)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error("Login error:", authError);
        return { error: "Invalid username or password" };
      }

      // Fetch user record from database using auth.uid()
      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (dbError || !userData) {
        console.error("Failed to fetch user record:", dbError);
        return { error: "Account setup incomplete. Please contact support." };
      }

      // Set user state
      localStorage.setItem("userId", userData.id);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // Set admin flag if applicable
      if (userData.is_admin) {
        setIsAuthenticated(true);
        localStorage.setItem("adminAuth", "true");
      }

      fetchUserClaims(userData.id);
      return { success: true, isAdmin: userData.is_admin || false };
    } catch (error) {
      console.error("Authentication error:", error);
      return { error: "Authentication failed" };
    }
  };

  /**
   * Toggles admin status for a user (admin-only operation).
   *
   * Calls the admin edge function to update the is_admin flag.
   * Requires valid admin session with JWT token.
   *
   * @param {string} userId - UUID of the user to update
   * @param {boolean} makeAdmin - True to grant admin, false to revoke
   * @returns {Promise<{success?: boolean, data?: Object, error?: string}>}
   *          Success object with updated data, or error object
   */
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

  /**
   * Registers a new user account.
   *
   * Creates a Supabase Auth user with email format (username@siege-clan.com).
   * Database trigger automatically creates the users table record.
   * Username is stored in auth metadata for the trigger to use.
   *
   * @param {string} username - Desired username (will be converted to email)
   * @param {string} password - User's password (min 6 characters)
   * @returns {Promise<{success?: boolean, error?: string}>}
   *          Success object or error with message
   *
   * @example
   * const result = await register('newuser', 'securepass123');
   * if (result.error) {
   *   console.error(result.error); // "Username already taken"
   * }
   */
  const register = async (username, password) => {
    try {
      const usernameInput = username.trim().toLowerCase();

      console.log("Checking if username exists:", usernameInput);

      // Check if username already exists with timeout
      // If the check fails or times out, we'll let the database handle uniqueness
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Username check timeout')), 5000)
        );

        const checkPromise = supabase
          .from("users")
          .select("id")
          .eq("username", usernameInput);

        const { data: existingUsers, error: checkError } = await Promise.race([
          checkPromise,
          timeoutPromise
        ]);

        console.log("Username check result:", { existingUsers, checkError });

        if (!checkError && existingUsers && existingUsers.length > 0) {
          return { error: "Username already taken" };
        }
      } catch (checkTimeout) {
        console.warn("Username check failed/timeout:", checkTimeout.message);
        // Continue with registration - database will enforce uniqueness
      }

      // Create user in Supabase Auth with timeout
      // The database trigger will automatically create the users table record
      console.log("Creating auth user...");

      let authData, authError;
      try {
        const signUpPromise = supabase.auth.signUp({
          email: `${usernameInput}@siege-clan.com`,
          password: password,
          options: {
            data: {
              username: usernameInput  // Store username in metadata for trigger
            },
            emailRedirectTo: undefined  // No email confirmation needed
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Signup timeout')), 10000)
        );

        const result = await Promise.race([signUpPromise, timeoutPromise]);
        authData = result.data;
        authError = result.error;
      } catch (signupTimeout) {
        console.error("Signup timeout:", signupTimeout);
        return { error: "Registration is taking too long. Please check your internet connection and try again." };
      }

      console.log("Auth signup result:", { authData, authError });

      if (authError) {
        console.error("Registration error:", authError);
        return { error: authError.message || "Registration failed" };
      }

      if (!authData?.user) {
        console.error("No user returned from signup");
        return { error: "Registration failed - no user created" };
      }

      console.log("Auth user created successfully, waiting for trigger...");
      // Wait for trigger to create user record
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("Fetching user record for id:", authData.user.id);

      // Fetch the created user record with timeout
      let userData, dbError;
      try {
        const fetchPromise = supabase
          .from("users")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User fetch timeout')), 5000)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        userData = result.data;
        dbError = result.error;
      } catch (fetchTimeout) {
        console.error("User record fetch timeout:", fetchTimeout);
        return { error: "Account created but setup incomplete. Try logging in." };
      }

      console.log("User record fetch result:", { userData, dbError });

      if (dbError) {
        console.error("Failed to fetch user record:", dbError);
        return { error: "Account created but setup incomplete. Try logging in." };
      }

      if (!userData) {
        console.error("User record not found after trigger");
        return { error: "Account created but setup incomplete. Try logging in." };
      }

      // Set user state
      localStorage.setItem("userId", userData.id);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

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

  /**
   * Logs out the current user.
   *
   * Clears localStorage, resets user state, and signs out from Supabase Auth.
   * Safe to call even if Supabase signOut fails.
   *
   * @returns {Promise<void>}
   */
  const logout = async () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("useServiceRole");
    setIsAuthenticated(false);
    setUser(null);
    setUserClaims([]);

    // Sign out from Supabase auth as well
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if Supabase signOut fails
    }
  };

  // Computed values instead of functions - more React-like
  const isAdmin = user?.is_admin === true;
  const isLoggedIn = user !== null;
  const isLoggedOut = user === null;

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
