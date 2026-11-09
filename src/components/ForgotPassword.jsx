import React from "react";
import { Link } from "react-router-dom";
import { FaKey, FaDiscord } from "react-icons/fa";
import Card from "./ui/Card";
import "../pages/RegistrationForm.css";

// The channel Login's "Forgot your password?" link pointed at before this
// page explained the process.
const DISCORD_HELP_URL =
  "https://discord.com/channels/967354755045290004/969286091725209600/1084852251882950746";

/**
 * Forgotten passwords are reset by an admin (User Management, Reset
 * Password), who passes on a temporary password.
 *
 * This page used to show a username box and "Submit Reset Request", which
 * only changed the text on screen: nothing was recorded and no admin was
 * told, so a member could wait for a reset that was never asked for.
 */
export default function ForgotPassword() {
  return (
    <div className="ui-auth-container">
      <Card className="ui-auth-card">
        <Card.Header>
          <h2 className="ui-auth-title">
            <FaKey className="ui-auth-icon" /> Forgot Your Password?
          </h2>
        </Card.Header>

        <Card.Body>
          <div className="ui-auth-help">
            <p>An admin can reset it for you.</p>
            <ol>
              <li>Ask an admin on Discord or in the clan chat, and tell them your username.</li>
              <li>They'll send you a temporary password.</li>
              <li>Sign in with it, then change it from Profile, then Account.</li>
            </ol>
          </div>

          <div className="ui-form-actions">
            <a
              className="ui-auth-discord"
              href={DISCORD_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaDiscord /> Ask on Discord
            </a>
          </div>

          <div className="ui-auth-redirect">
            Remembered it? <Link to="/login" className="ui-auth-link">Sign in</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
