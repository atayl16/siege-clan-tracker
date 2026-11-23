import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://www.siege-clan.com";
const SUFFIX = "Siege OSRS Clan";

/**
 * Each public page's title and search-result description. The home page's
 * also live in index.html, for crawlers that do not run JavaScript; keep the
 * two in step, and keep public/sitemap.xml listing the same pages.
 */
export const PAGES = {
  "/": {
    title: "Siege | Old School RuneScape Clan, Recruiting | W517",
    description:
      "Siege is a friendly, active Old School RuneScape (OSRS) clan. Clan chat Siege, home world 517. Skillers, ironmen and PvMers welcome, with weekly competitions, events and PvM bingo.",
  },
  "/members": {
    title: `Members | ${SUFFIX}`,
    description: "Every member of the Siege OSRS clan, with their clan rank, total level, EHB and Siege Score.",
  },
  "/events": {
    title: `Events | ${SUFFIX}`,
    description: "Skill of the Week, Boss of the Week and Raid of the Week competitions and other events in the Siege OSRS clan.",
  },
  "/leaderboard": {
    title: `Leaderboard | ${SUFFIX}`,
    description: "Siege Score standings, weekly XP leaders and this week's title races in the Siege OSRS clan.",
  },
  "/bosses": {
    title: `Hall of Fame | ${SUFFIX}`,
    description: "The Siege OSRS clan's Hall of Fame: the top players for every boss and activity, by kill count.",
  },
  "/stats": {
    title: `Clan Stats | ${SUFFIX}`,
    description: "Stats for the Siege OSRS clan: members, average level and XP, maxed accounts and 200M skills.",
  },
  "/achievements": {
    title: `Achievements | ${SUFFIX}`,
    description: "Recent milestones, drops, quests and combat achievements from members of the Siege OSRS clan.",
  },
  "/progress": {
    title: `Races & Goals | ${SUFFIX}`,
    description: "Races between Siege clan members and their personal OSRS goals.",
  },
  "/register": {
    title: `Create an Account | ${SUFFIX}`,
    description: "Sign up to the Siege OSRS clan site to claim your characters, set goals and join races.",
  },
  "/privacy": {
    title: `Privacy | ${SUFFIX}`,
    description: "What the Siege OSRS clan site keeps about you, why, and what you can do about it.",
  },
  "/login": { title: `Log In | ${SUFFIX}`, description: null },
  "/forgot-password": { title: `Forgot Password | ${SUFFIX}`, description: null, noindex: true },
};

// Pages that are someone's own or staff-only: never in search results.
const PRIVATE_PREFIXES = ["/admin", "/profile", "/races/"];

// The same page under two addresses: point search engines at one.
const CANONICAL = { "/new-members": "/" };

function setMeta(selector, create, value) {
  let el = document.head.querySelector(selector);
  if (value == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(el.tagName === "LINK" ? "href" : "content", value);
}

/** What a path should set: title, description, canonical URL, noindex. */
export function metaFor(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const canonicalPath = CANONICAL[path] ?? path;
  const page = PAGES[canonicalPath];

  if (PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return { title: SUFFIX, description: null, canonical: null, noindex: true };
  }
  if (!page) {
    return { title: `Page not found | ${SUFFIX}`, description: null, canonical: null, noindex: true };
  }
  return {
    title: page.title,
    description: page.description,
    canonical: `${SITE}${canonicalPath === "/" ? "/" : canonicalPath}`,
    noindex: Boolean(page.noindex),
  };
}

/**
 * Sets the page title, description, canonical link and robots tag for the
 * current route. Renders nothing.
 */
export default function PageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaFor(pathname);
    document.title = meta.title;
    setMeta('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }), meta.description);
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), meta.canonical);
    setMeta('meta[name="robots"]', () => Object.assign(document.createElement("meta"), { name: "robots" }), meta.noindex ? "noindex" : null);
  }, [pathname]);

  return null;
}
