import { createContext, useContext, useState } from "react";
import { sha256 } from "crypto-hash"; // Install with: npm install crypto-hash

const AuthContext = createContext();

// Pre-computed hash values of credentials (generated server-side)
// Replace these with your actual hashed values
const ADMIN_EMAIL_HASH =
  "8c91a3d71da50b56d355e4b61ff793842befb82bd5972e3b0d84fb771e450428";
const ADMIN_PASSWORD_HASH =
  "86c671c7a776b62f925b5d2387fae4c73392931be4d37b19e37e5534abab587d";

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );

  const login = async (username, password) => {
    try {
      // Hash the provided credentials
      const usernameHash = await sha256(username.trim().toLowerCase());
      const passwordHash = await sha256(password);

      // Compare hashes instead of raw values
      if (
        usernameHash === ADMIN_EMAIL_HASH &&
        passwordHash === ADMIN_PASSWORD_HASH
      ) {
        localStorage.setItem("adminAuth", "true");
        setIsAuthenticated(true);
        return { success: true };
      }

      return { error: "Invalid credentials" };
    } catch (error) {
      console.error("Authentication error:", error);
      return { error: "Authentication failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
  };

  const isAdmin = () => {
    return isAuthenticated;
  };

  const isLoggedIn = () => {
    return isAuthenticated;
  };

  const isLoggedOut = () => {
    return !isAuthenticated;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        isAdmin,
        isLoggedIn,
        isLoggedOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
