import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import PageMeta, { metaFor, PAGES } from "../components/PageMeta";

const head = (selector, attr) => document.head.querySelector(selector)?.getAttribute(attr) ?? null;

describe("metaFor", () => {
  it("gives the home page the recruiting title and its canonical URL", () => {
    expect(metaFor("/")).toMatchObject({
      title: PAGES["/"].title,
      canonical: "https://www.siege-clan.com/",
      noindex: false,
    });
    expect(metaFor("/").title).toMatch(/Old School RuneScape Clan/);
  });

  it("points the duplicate home address at the home page", () => {
    expect(metaFor("/new-members").canonical).toBe("https://www.siege-clan.com/");
  });

  it("ignores a trailing slash", () => {
    expect(metaFor("/members/").canonical).toBe("https://www.siege-clan.com/members");
  });

  it("keeps private and unknown pages out of search results", () => {
    for (const path of ["/admin", "/admin/members", "/profile", "/races/4/edit", "/no-such-page"]) {
      expect(metaFor(path)).toMatchObject({ noindex: true, canonical: null, description: null });
    }
  });
});

describe("PageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="old">';
  });

  it("sets the title, description and canonical link for the page", () => {
    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <PageMeta />
      </MemoryRouter>
    );
    expect(document.title).toBe("Leaderboard | Siege OSRS Clan");
    expect(head('meta[name="description"]', "content")).toBe(PAGES["/leaderboard"].description);
    expect(head('link[rel="canonical"]', "href")).toBe("https://www.siege-clan.com/leaderboard");
    expect(head('meta[name="robots"]', "content")).toBeNull();
  });

  it("marks a private page noindex and drops its description", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <PageMeta />
      </MemoryRouter>
    );
    expect(head('meta[name="robots"]', "content")).toBe("noindex");
    expect(head('meta[name="description"]', "content")).toBeNull();
  });
});
