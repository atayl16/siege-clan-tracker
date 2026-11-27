import React from "react";
import { Link } from "react-router";
import "./SiteFooter.css";

const DISCORD_URL = "https://discord.gg/TqFpRD4vNv";

/**
 * Bottom of every page: links, where the data comes from, and the notice
 * Jagex's Fan Content Policy (section 8.1) requires, in its exact words.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Footer">
        <Link to="/">Siege</Link>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
          Discord
        </a>
        <Link to="/about">About</Link>
        <Link to="/about#privacy">Privacy</Link>
      </nav>
      <p className="site-footer-data">
        Player stats from{" "}
        <a href="https://wiseoldman.net" target="_blank" rel="noopener noreferrer">
          Wise Old Man
        </a>{" "}
        and{" "}
        <a href="https://www.runeprofile.com" target="_blank" rel="noopener noreferrer">
          RuneProfile
        </a>
        .
      </p>
      <p className="site-footer-legal">
        Created using intellectual property belonging to Jagex Limited under the terms of Jagex&apos;s Fan Content
        Policy. This content is not endorsed by or affiliated with Jagex. Old School RuneScape is a trademark of
        Jagex Limited.
      </p>
    </footer>
  );
}
