import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router";

import BackgroundLoader from "./utils/BackgroundLoader";

import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";

import RegistrationForm from "./pages/RegistrationForm";
import Login from "./components/Login";
import AdminPage from "./pages/AdminPage";
import MembersPage from "./pages/MembersPage";
import EventsPage from "./pages/EventsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import EditRacePage from "./pages/EditRacePage";
import AchievementsPage from "./pages/AchievementsPage";
import NewMembers from "./pages/NewMembers";
import NotFoundPage from "./pages/NotFoundPage";
import ForgotPassword from "./components/ForgotPassword";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AnniversaryBanner from "./components/AnniversaryBanner";
import PageMeta from "./components/PageMeta";
import SiteFooter from "./components/SiteFooter";
import ScrollToTop from "./components/ScrollToTop";
import AboutPage from "./pages/AboutPage";
import SeasonalFavicon from "./utils/seasonalIcons";

import "./styles/App.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function App() {
  // Create a wrapper component to check the current route
  const AppContent = () => {
    // Every page shows the navbar. The sign-in pages used to hide it, which
    // left no way back to the site except the browser's Back button.
    return (
      <div className="App has-navbar">
        <SeasonalFavicon />
        <PageMeta />
        <ScrollToTop />
        <Navbar />
        {/* <AnniversaryBanner /> */}
        <Routes>
          <Route path="/" element={<NewMembers />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          {/* Pages that became tabs: old links and bookmarks open the tab. */}
          <Route path="/stats" element={<Navigate to="/members?tab=stats" replace />} />
          <Route path="/progress" element={<Navigate to="/events?tab=races" replace />} />
          <Route path="/bosses" element={<Navigate to="/leaderboard?tab=hall-of-fame" replace />} />
          <Route path="/races/:id/edit" element={<EditRacePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<Navigate to="/about#privacy" replace />} />
          <Route path="/new-members" element={<NewMembers />} />

          {/* Admin Routes - All protected */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <AdminPage />
                </DataProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <AdminPage />
                </DataProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members/new"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <AdminPage />
                </DataProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members/deleted"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <AdminPage />
                </DataProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/new"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <AdminPage />
                </DataProvider>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
        <SiteFooter />
      </div>
    );
  };

  return (
    <>
      <BackgroundLoader />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;
