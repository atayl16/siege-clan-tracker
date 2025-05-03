import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from "react-router-dom";

import BackgroundLoader from "./utils/BackgroundLoader";

import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";

import RegistrationForm from "./pages/RegistrationForm";
import Login from "./components/Login";
import AdminPage from "./pages/AdminPage";
import MembersPage from "./pages/MembersPage";
import EventsPage from "./pages/EventsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import QuickStatsPage from "./pages/QuickStatsPage";
import BossStatsPage from "./pages/BossStatsPage";
import ProfilePage from "./pages/ProfilePage";
import ProgressPage from "./pages/ProgressPage";
import AchievementsPage from "./pages/AchievementsPage";
import NewMembers from "./pages/NewMembers";
import ForgotPassword from "./components/ForgotPassword";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AnniversaryBanner from "./components/AnniversaryBanner";
import SeasonalFavicon from "./utils/seasonalIcons";

import "./styles/App.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function App() {
  // Create a wrapper component to check the current route
  const AppContent = () => {
    const location = useLocation();
    
    // More robust check - only hide navbar on welcome page or auth pages
    const hideNavbarPaths = [
      "/login", 
      "/register", 
      "/forgot-password"
    ];
    
    const showNavbar = !hideNavbarPaths.includes(location.pathname);

    return (
      <div className={`App ${showNavbar ? "has-navbar" : ""}`}>
        <SeasonalFavicon />
        {showNavbar && <Navbar />}
        {<AnniversaryBanner />}
        <Routes>
          <Route path="/" element={<NewMembers />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/stats" element={<QuickStatsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/new-members" element={<NewMembers />} />
          <Route path="/bosses" element={<BossStatsPage />} />

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
      <BackgroundLoader />

      <DataProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
