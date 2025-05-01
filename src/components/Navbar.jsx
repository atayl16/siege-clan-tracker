import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSeasonalIcon } from "../utils/seasonalIcons";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const { isAdmin, logout, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navbar = document.getElementById('navbar-links');
      const hamburger = document.getElementById('navbar-toggle');
      if (isOpen && navbar && !navbar.contains(event.target) && !hamburger.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <nav className="navbar" style={{ backgroundColor: "black" }}>
      <div className="navbar-container">
        <Link className="navbar-brand" to="/">
          <img
            src={getSeasonalIcon()}
            alt="Siege Logo"
            width="50"
            height="50"
            className="navbar-logo"
          />
          <span className="brand-name">Siege Clan</span>
        </Link>

        <button
          id="navbar-toggle"
          className={`navbar-toggle ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div
          id="navbar-links"
          className={`navbar-links ${isOpen ? "active" : ""}`}
        >
          {/* Main Navigation Links */}
          <Link
            to="/"
            className={location.pathname === "/" ? "active" : ""}
          >
            Home
          </Link>

          <Link
            to="/members"
            className={location.pathname === "/members" ? "active" : ""}
          >
            Members
          </Link>

          <Link
            to="/events"
            className={location.pathname === "/events" ? "active" : ""}
          >
            Events
          </Link>

          <Link
            to="/leaderboard"
            className={location.pathname === "/leaderboard" ? "active" : ""}
          >
            Leaderboard
          </Link>

          <Link
            to="/about"
            className={location.pathname === "/about" ? "active" : ""}
          >
            About Us
          </Link>

          <Link
            to="/achievements"
            className={location.pathname === "/achievements" ? "active" : ""}
          >
            Achievements
          </Link>
        </div>
      </div>
    </nav>
  );
}
