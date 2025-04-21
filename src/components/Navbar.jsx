import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSeasonalIcon } from "../utils/seasonalIcons";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const { isAdmin, logout, isLoggedIn } = useAuth();

  return (
    <nav
      className="navbar navbar-dark navbar-expand-lg sticky-top"
      style={{ backgroundColor: "black" }}
    >
      <div className="container-fluid">
        <Link className="navbar-brand" to="/members">
          <img
            src={getSeasonalIcon()}
            alt="Siege Logo"
            width="50"
            height="50"
            className="d-inline-block align-text-top me-2"
          />
          Siege Clan
        </Link>

        <div className="navbar-links">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            Home
          </Link>

          <Link
            to="/members"
            className={location.pathname === "/members" ? "active" : ""}
          >
            Members
          </Link>

          {/* Authentication links */}
          {isLoggedIn() ? (
            <>
              <Link
                to="/profile"
                className={location.pathname === "/profile" ? "active" : ""}
              >
                My Profile
              </Link>

              {isAdmin() && (
                <Link
                  to="/admin"
                  className={location.pathname === "/admin" ? "active" : ""}
                >
                  Admin
                </Link>
              )}

              <button onClick={logout} className="logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={location.pathname === "/login" ? "active" : ""}
              >
                Login
              </Link>

              <Link
                to="/register"
                className={location.pathname === "/register" ? "active" : ""}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
