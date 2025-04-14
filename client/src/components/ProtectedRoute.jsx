import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  console.log("Protected Route - Auth Status:", isAuthenticated);
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
