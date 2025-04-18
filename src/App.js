import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import 'bootstrap-icons/font/bootstrap-icons.css';
import AdminLogin from "./components/AdminLogin";
import AdminPage from "./pages/AdminPage";
import MembersPage from "./pages/MembersPage";
import WelcomePage from "./pages/WelcomePage";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  // Create a wrapper component to check the current route
const AppContent = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <div className={`App ${showNavbar ? "has-navbar" : ""}`}>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/login" element={<AdminLogin />} />

        {/* Admin Routes - All protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members/new"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members/deleted"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/new"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={<div className="page-container">404 - Page Not Found</div>}
        />
      </Routes>
    </div>
  );
};

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
