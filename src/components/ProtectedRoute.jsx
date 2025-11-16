import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protected route component for admin-only pages.
 *
 * Redirects to login page if user is not an admin.
 * Used to wrap admin-only routes like AdminPage.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if admin
 * @returns {JSX.Element} Children if admin, otherwise Navigate to login
 *
 * @example
 * <Route path="/admin" element={
 *   <ProtectedRoute>
 *     <AdminPage />
 *   </ProtectedRoute>
 * } />
 */
export default function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth();

  return isAdmin ? children : <Navigate to="/login" replace />;
}
