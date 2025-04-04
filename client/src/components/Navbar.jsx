import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li className="nav-link">
          <Link to="/members">Members</Link>
        </li>
        {isAuthenticated && (
          <li className="nav-link">
            <Link to="/admin">Admin</Link>
          </li>
        )}
        {!isAuthenticated && (
          <li className="nav-link">
            <Link to="/login">Admin Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
