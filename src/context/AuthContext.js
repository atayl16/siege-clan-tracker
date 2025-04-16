import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );

  const login = (username, password) => {
    // Temporary hardcoded credentials for testing
    if (username === "admin" && password === "") {
      localStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
      return { token: "temporary-token", user: { username: "admin" } };
    }
  
    // If credentials are incorrect, return an error
    return { error: "Invalid credentials" };
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
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isAdmin, isLoggedIn, isLoggedOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
