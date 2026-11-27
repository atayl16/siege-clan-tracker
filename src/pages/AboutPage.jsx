import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { xpWeekContaining } from "../utils/xpWeek";
import { formatWeekdayTime } from "../utils/dates";
import "./AboutPage.css";

const DISCORD_URL = "https://discord.gg/TqFpRD4vNv";
const SUGGESTIONS_URL = "https://discord.com/channels/967354755045290004/968426819755868210";

const SECTIONS = [
  ["how-it-works", "How the Site Works"],
  ["suggestions", "Suggestions Welcome"],
  ["where-stats-come-from", "Where Stats Come From"],
  ["updates", "How Often It Updates"],
  ["privacy", "Privacy"],
];

const external = { target: "_blank", rel: "noopener noreferrer" };

/**
 * About the site, linked from the footer: how it works, where to send
 * suggestions, where the stats come from, how often they update, and
 * privacy. Written for members, not developers: keep it plain.
 *
 * Keep it true to what the site does: update the update times when the sync
 * schedules change, and the privacy section when the site starts
 * collecting, storing or sharing anything new.
 */
export default function AboutPage() {
  const { hash } = useLocation();

  // The next week turnover on the visitor's clock, left out when that clock
  // reads the same as the UK's.
  const turnover = xpWeekContaining().end;
  const localTurnover = formatWeekdayTime(turnover);
  const sameAsUk = localTurnover === formatWeekdayTime(turnover, { timeZone: "Europe/London" });

  // The router does not scroll to #privacy etc. on its own.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="ui-page-container about-page">
      <h2>About the Site</h2>
      <p>
        This is where Siege keeps track of the clan: who&apos;s in it, how everyone is getting on, and what&apos;s
        happening this week. Here&apos;s how it all works, and how you can help make it better.
      </p>

      <nav className="about-contents" aria-label="On this page">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <section aria-labelledby="how-it-works">
        <h3 id="how-it-works">How the Site Works</h3>
        <dl className="about-faq">
          <dt>Getting Started</dt>
          <dd>
            <Link to="/register">Make an account</Link> (no email needed), then claim your characters from your
            profile. A staff member approves each claim. Claim your alts too: you can have as many as you like.
          </dd>

          <dt>Siege Score</dt>
          <dd>
            You earn points by placing in clan competitions, the weekly XP race and the weekly title races. Your
            profile shows where your points came from, and the <Link to="/leaderboard">Leaderboard</Link> explains how
            they&apos;re awarded.
          </dd>

          <dt>Ranks</dt>
          <dd>Your rank follows your progress. When you&apos;ve earned the next one, staff are told so they can give it to you.</dd>

          <dt>Goals and Races</dt>
          <dd>
            Set yourself goals, or race other members to a target, from your profile. They keep up with your stats on
            their own.
          </dd>

          <dt>Missing Drops or Quests?</dt>
          <dd>
            Those come from RuneProfile, so they only show if you use its RuneLite plugin. Levels, XP and boss kills
            show for everyone.
          </dd>

          <dt>Forgotten Your Password?</dt>
          <dd>
            Ask a staff member on Discord and they&apos;ll reset it. <Link to="/forgot-password">More on that</Link>.
          </dd>
        </dl>
      </section>

      <section aria-labelledby="suggestions" className="about-callout">
        <h3 id="suggestions">Suggestions Welcome</h3>
        <p>
          This site is built for the clan, so we really do want to hear from you: ideas for new things, something
          that&apos;s confusing, or something that doesn&apos;t look right. Every suggestion gets read.
        </p>
        <p>
          <a className="about-button" href={SUGGESTIONS_URL} {...external}>
            Share a Suggestion
          </a>
          <span className="about-aside">
            It opens our suggestions channel on Discord. Not in our Discord yet?{" "}
            <a href={DISCORD_URL} {...external}>
              Join here
            </a>
            .
          </span>
        </p>
      </section>

      <section aria-labelledby="where-stats-come-from">
        <h3 id="where-stats-come-from">Where Stats Come From</h3>
        <ul>
          <li>
            <strong>Levels, XP and boss kills</strong> come from{" "}
            <a href="https://wiseoldman.net" {...external}>
              Wise Old Man
            </a>
            , which reads the official hiscores.
          </li>
          <li>
            <strong>Drops, quests and collection log</strong> come from{" "}
            <a href="https://www.runeprofile.com" {...external}>
              RuneProfile
            </a>
            , for players who use its RuneLite plugin.
          </li>
          <li>
            <strong>Ranks, Siege Score, competitions and titles</strong> are the clan&apos;s own, worked out by the
            site and looked after by staff.
          </li>
        </ul>
      </section>

      <section aria-labelledby="updates">
        <h3 id="updates">How Often It Updates</h3>
        <ul>
          <li>
            <strong>Your stats</strong> are refreshed at least once a day. Want a new level to show sooner? Look
            yourself up on Wise Old Man and press Update, and the site picks it up within the hour.
          </li>
          <li>
            <strong>Competitions, goals and races</strong> are checked every hour.
          </li>
          <li>
            <strong>The clan week</strong> runs from Monday 7pm UK time
            {!sameAsUk && ` (${localTurnover} where you are)`}. Weekly titles and XP points are handed out
            shortly after it ends.
          </li>
          <li>
            <strong>Skill, Boss and Raid of the Week</strong> are voted on in Discord: polls open on Monday evening and
            close on Friday.
          </li>
        </ul>
      </section>

      <section aria-labelledby="privacy">
        <h3 id="privacy">Privacy</h3>
        <p className="about-updated">Last updated 23 November 2026</p>
        <p>
          Clan members run Siege and this site in their spare time. This is everything the site stores about you and
          who sees it. Nothing is sold, and there are no adverts.
        </p>

        <h4>Stored About You</h4>
        <ul>
          <li>
            <strong>Sign-in</strong>: a username, and a hash of your password, never the password itself. No email
            address is needed or kept.
          </li>
          <li>
            <strong>Your activity</strong>: characters you claim and the note you add to a claim, your goals and races,
            and the character you picked as your main.
          </li>
          <li>
            <strong>Clan history</strong>: each member&apos;s name, rank, join date, Siege Score, competition placings
            and weekly awards.
          </li>
        </ul>

        <h4>Public and Private</h4>
        <p>
          Anyone can view the member list, leaderboards, competition results, achievements, and goals or races marked
          public. Passwords, claim notes and private goals stay hidden. Staff review claim requests, and each new
          request is posted in a Discord channel only staff can read.
        </p>

        <h4>Outside Services</h4>
        <ul>
          <li>Netlify, to host the site.</li>
          <li>Supabase, to store the database.</li>
          <li>Wise Old Man and RuneProfile, for game stats.</li>
          <li>Discord, where the clan&apos;s bot posts weekly results and staff alerts.</li>
          <li>
            Sentry, to tell us when something on the site breaks. An error report includes your browser details and IP
            address.
          </li>
        </ul>

        <h4>Browser Storage</h4>
        <p>
          The site keeps you signed in, and remembers small things like when your goals were last updated, in your
          browser&apos;s own storage. That stays on your device, and signing out clears your sign-in.
        </p>

        <h4>Changing or Deleting Your Data</h4>
        <p>
          You can change your username or password on your <Link to="/profile">profile</Link>. To delete your account,
          or with any question about this page, message a staff member on our{" "}
          <a href={DISCORD_URL} {...external}>
            Discord
          </a>
          .
        </p>
      </section>
    </div>
  );
}
