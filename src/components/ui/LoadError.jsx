import React, { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import "./LoadError.css";

/**
 * A page section that failed to load: a plain explanation and a retry.
 *
 * Replaces three hand-copied banners (Members, Events, Leaderboard) that
 * crammed a title, the raw error ("TypeError: Failed to fetch") and the
 * button onto one line, inside a box inside a box. The technical error goes
 * to the console, where it is useful, not on screen.
 */
export default function LoadError({ what = "this page", error, onRetry }) {
  useEffect(() => {
    if (error) console.error(`Failed to load ${what}:`, error);
  }, [error, what]);

  return (
    <div className="load-error" role="alert">
      <FaExclamationTriangle className="load-error-icon" aria-hidden="true" />
      <div className="load-error-text">
        <strong>Couldn't load {what}.</strong>
        <span>Check your connection and try again.</span>
      </div>
      {onRetry && (
        <button type="button" className="load-error-retry" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}
