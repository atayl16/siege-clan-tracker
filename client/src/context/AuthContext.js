import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );

  const login = () => {
    localStorage.setItem("adminAuth", "true");
    setIsAuthenticated(true);
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
