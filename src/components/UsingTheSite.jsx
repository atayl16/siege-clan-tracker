import React from "react";
import { Link } from "react-router-dom";
import { FaCompass } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { isBuiltInAdmin } from "../utils/builtInAdmin";

/**
 * "Using the site": the three steps from visitor to tracked member, on the
 * home page under "Join Us". Always shown. Signed-in members get a link to
 * their profile in place of "Sign up", and the claim link opens their claim
 * form.
 */
export default function UsingTheSite() {
  const { user } = useAuth();
  const signedIn = Boolean(user) && !isBuiltInAdmin(user);

  const steps = [
    {
      key: "account",
      title: "Create an account",
      text: "Pick a username and a password. No email needed.",
      action: signedIn ? (
        <Link to="/profile" className="nm-step-link">
          You're signed in: go to your profile →
        </Link>
      ) : (
        <Link to="/register" className="nm-step-button">
          Sign up
        </Link>
      ),
      extra: !signedIn && (
        <span className="nm-step-aside">
          Already have one? <Link to="/login">Log in</Link>
        </span>
      ),
    },
    {
      key: "claim",
      title: "Claim your characters",
      text: "Tell us which characters are yours: your main and any alts. A staff member approves each claim.",
      action: (
        <Link to={signedIn ? "/profile?tab=requests" : "/register"} className="nm-step-link">
          Claim a character →
        </Link>
      ),
    },
    {
      key: "track",
      title: "Track and compete",
      text: "Set goals, join races, and follow weekly titles and Siege Score on the Leaderboard.",
      action: (
        <Link to="/leaderboard" className="nm-step-link">
          How points work →
        </Link>
      ),
    },
  ];

  return (
    <section className="nm-section-container" aria-labelledby="using-the-site-h">
      <h3 className="nm-section-title" id="using-the-site-h">
        <FaCompass className="nm-section-icon" /> Using the site
      </h3>

      <ol className="nm-steps">
        {steps.map((step, i) => (
          <li key={step.key} className="nm-step">
            <span className="nm-step-number" aria-hidden="true">
              {i + 1}
            </span>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
            {step.action}
            {step.extra}
          </li>
        ))}
      </ol>
    </section>
  );
}
