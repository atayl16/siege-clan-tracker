import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import MembersPage from "./pages/MembersPage";
import AdminPage from "./pages/AdminPage";
import AdminLogin from "./components/AdminLogin";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<Navigate to="/members" replace />} />
              <Route path="/members" element={<MembersPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<AdminLogin />} />
              <Route
                path="*"
                element={
                  <div className="page-container">404 - Page Not Found</div>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
