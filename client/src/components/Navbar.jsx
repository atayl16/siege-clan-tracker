import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import siegeLogo from "../assets/images/siege_logo.png";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  
  return (
    <nav className="navbar navbar-dark navbar-expand-lg sticky-top" style={{ backgroundColor: "black" }}>
      <div className="container-fluid">
        <Link className="navbar-brand" to="/members">
          <img src={siegeLogo} alt="Siege Logo" width="50" height="50" className="d-inline-block align-text-top me-2" />
          Siege Clan
        </Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" 
                data-bs-target="#navbarContent" aria-controls="navbarContent" 
                aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarContent">
          <div className="ms-auto d-flex">
            {isAuthenticated ? (
              <>
                {/* Players Dropdown */}
                <div className="nav-item dropdown me-3">
                  <button 
                    className="nav-link dropdown-toggle text-white bg-transparent border-0" 
                    id="playersDropdown" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false"
                    type="button"
                  >
                    Players
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="playersDropdown">
                    <li><Link className="dropdown-item" to="/members">XP Tracker</Link></li>
                    <li><Link className="dropdown-item" to="/leaderboard">Leaderboard</Link></li>
                    <li><Link className="dropdown-item" to="/achievements">Achievements</Link></li>
                    <li><Link className="dropdown-item" to="/admin/members">Admin Table</Link></li>
                    <li><Link className="dropdown-item" to="/admin/members/new">Add a Player</Link></li>
                    <li><Link className="dropdown-item" to="/admin/members/deleted">Deleted Players</Link></li>
                    <li><a className="dropdown-item" href="https://wiseoldman.net/groups/2928" target="_blank" rel="noopener noreferrer">WOM Members</a></li>
                    <li><a className="dropdown-item" href="https://wiseoldman.net/groups/2928/name-changes" target="_blank" rel="noopener noreferrer">WOM Name Changes</a></li>
                  </ul>
                </div>
                
                {/* Events Dropdown */}
                <div className="nav-item dropdown me-3">
                  <button 
                    className="nav-link dropdown-toggle text-white bg-transparent border-0" 
                    id="eventsDropdown" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false"
                    type="button"
                  >
                    Events
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="eventsDropdown">
                    <li><Link className="dropdown-item" to="/events">Events</Link></li>
                    <li><Link className="dropdown-item" to="/leaderboard">Leaderboard</Link></li>
                    <li><Link className="dropdown-item" to="/admin/events/new">Add a New Event</Link></li>
                    <li><Link className="dropdown-item" to="/gallery">Gallery</Link></li>
                    <li><a className="dropdown-item" href="https://wiseoldman.net/groups/2928/competitions" target="_blank" rel="noopener noreferrer">WOM Events</a></li>
                  </ul>
                </div>
                
                {/* Admin Actions */}
                <Link to="/admin/members/new" className="btn btn-dark me-2">Add Player</Link>
                <button onClick={logout} className="btn btn-dark">Sign Out</button>
              </>
            ) : (
              <>
                {/* Public Navigation */}
                <Link to="/members" className="btn btn-dark me-2">XP Tracker</Link>
                <Link to="/events" className="btn btn-dark me-2">Events</Link>
                <Link to="/leaderboard" className="btn btn-dark me-2">Leaderboard</Link>
                <Link to="/login" className="btn btn-dark">Admin?</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
