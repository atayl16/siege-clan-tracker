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
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/members">Home</Link>
            </li>
            
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/admin/members">Admin</Link>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link" 
                    onClick={logout}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link className="nav-link" to="/login">Admin?</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
