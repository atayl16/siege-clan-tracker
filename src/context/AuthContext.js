import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );

  const login = (username, password) => {
    // Use environment variables for authentication
    const validUsername = process.env.ADMIN_EMAIL;
    const validPassword = process.env.WOM_VERIFICATION_CODE;
    
    if (username === validUsername && password === validPassword) {
      localStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
      return { token: "auth-token", user: { username: validUsername } };
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
