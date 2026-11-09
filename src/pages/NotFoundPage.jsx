import React from "react";
import { Link } from "react-router-dom";
import { FaCompass } from "react-icons/fa";
import EmptyState from "../components/ui/EmptyState";
import "./NotFoundPage.css";

/**
 * Shown for any URL no route matches. It used to be a bare "404 - Page Not
 * Found" line with no styling, which was easy to miss on the dark theme.
 */
export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <EmptyState
        icon={<FaCompass />}
        title="Page Not Found"
        description="That page doesn't exist, or it may have moved."
        action={
          <div className="not-found-links">
            <Link to="/" className="not-found-link not-found-link-primary">
              Go Home
            </Link>
            <Link to="/members" className="not-found-link">
              Members
            </Link>
            <Link to="/progress" className="not-found-link">
              Races &amp; Goals
            </Link>
          </div>
        }
      />
    </div>
  );
}
