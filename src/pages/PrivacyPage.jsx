import React from "react";
import { Link } from "react-router-dom";
import "./PrivacyPage.css";

const DISCORD_URL = "https://discord.gg/TqFpRD4vNv";

/**
 * Plain-language privacy page, linked from the footer. Keep it true to what
 * the site does: update it when the site starts collecting, storing or
 * sharing anything new.
 */
export default function PrivacyPage() {
  return (
    <div className="ui-page-container privacy-page">
      <h2>Privacy</h2>
      <p className="privacy-updated">Last updated 23 November 2026</p>

      <p>
        Siege is an Old School RuneScape clan, and this site is run by its members as a hobby. This page says what the
        site keeps about you, why, and what you can do about it. We don&apos;t sell your data and we don&apos;t show
        ads.
      </p>

      <h3>What we keep</h3>
      <ul>
        <li>
          <strong>Your account</strong>, if you make one: your username and your password, stored as a scrambled hash
          rather than as typed. We don&apos;t ask for your email address.
        </li>
        <li>
          <strong>What you do on the site</strong>: the characters you claim (and any message you send with a claim),
          your goals and races, and which character is your main.
        </li>
        <li>
          <strong>Clan records</strong>: members&apos; names, ranks, join dates, Siege Score, competition results and
          weekly awards.
        </li>
      </ul>

      <h3>Game stats</h3>
      <p>
        Levels, XP, boss kills and similar stats come from public services:{" "}
        <a href="https://wiseoldman.net" target="_blank" rel="noopener noreferrer">
          Wise Old Man
        </a>
        , which reads Jagex&apos;s public hiscores, and{" "}
        <a href="https://www.runeprofile.com" target="_blank" rel="noopener noreferrer">
          RuneProfile
        </a>
        , for players who use its RuneLite plugin. Anyone can already see these on those sites.
      </p>

      <h3>What other people can see</h3>
      <p>
        The member list, leaderboards, competition results, achievements and public goals and races are public. Your
        password, your claim messages and your private goals are not. Clan staff can see claim requests so they can
        approve them, and a claim request is posted to a staff-only Discord channel.
      </p>

      <h3>Services the site uses</h3>
      <ul>
        <li>Netlify, to host the site.</li>
        <li>Supabase, to store the database.</li>
        <li>Wise Old Man and RuneProfile, for game stats (see above).</li>
        <li>Discord, where the clan&apos;s bot posts weekly results and staff alerts.</li>
        <li>
          Sentry, to tell us when something on the site breaks. An error report includes your browser details and IP
          address.
        </li>
      </ul>

      <h3>Your browser</h3>
      <p>
        The site keeps you signed in, and remembers small things like when your goals were last updated, in your
        browser&apos;s own storage. That stays on your device, and signing out clears your sign-in.
      </p>

      <h3>Changing or deleting your data</h3>
      <p>
        You can change your username or password on your <Link to="/profile">profile</Link>. To delete your account,
        or with any question about this page, message a staff member on our{" "}
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
          Discord
        </a>
        .
      </p>
    </div>
  );
}
