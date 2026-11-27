import { describe, it, expect, vi, afterEach } from "vitest";
import {
  pickLocale,
  formatDate,
  formatDay,
  formatDateTime,
  formatWeekdayTime,
  localWhen,
  calendarDay,
  localIsoDate,
} from "../dates";

// jsdom's browser language is en-US, so these read US style unless a test
// loads the module again with another browser.

// Local midday on 9 Nov: 9 Nov on any test machine's clock. (Noon UTC is
// already 10 Nov in New Zealand.)
const NOV_9 = new Date(2026, 10, 9, 12);

describe("pickLocale", () => {
  it("takes the first regional English in the browser's list", () => {
    expect(pickLocale(["en-AU", "en-US"], "America/Chicago")).toBe("en-AU");
    expect(pickLocale(["nl-NL", "en-GB"], "America/Chicago")).toBe("en-GB");
    expect(pickLocale(["en-Latn-US"], "Europe/London")).toBe("en-US");
  });

  it("goes by the time zone for a browser in another language, or in plain English", () => {
    expect(pickLocale(["de-DE", "en"], "America/New_York")).toBe("en-US");
    expect(pickLocale(["en"], "US/Pacific")).toBe("en-US");
    expect(pickLocale(["en"], "Pacific/Honolulu")).toBe("en-US");
    expect(pickLocale(["nl-NL"], "Europe/Amsterdam")).toBe("en-GB");
    expect(pickLocale(["es-MX"], "America/Mexico_City")).toBe("en-GB");
    expect(pickLocale([], "")).toBe("en-GB");
  });

  it("skips anything that is not a language tag", () => {
    expect(pickLocale(["", "not a tag!", "en-CA"], "")).toBe("en-CA");
  });
});

describe("siteLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const withBrowser = async (languages) => {
    vi.stubGlobal("navigator", { languages, language: languages[0] });
    vi.resetModules();
    return import("../dates");
  };

  it("writes dates in the browser's own English", async () => {
    const uk = await withBrowser(["fr-FR", "en-GB"]);
    expect(uk.siteLocale()).toBe("en-GB");
    expect(uk.formatDate(NOV_9)).toBe("9 Nov 2026");

    const us = await withBrowser(["en-US"]);
    expect(us.formatDate(NOV_9)).toBe("Nov 9, 2026");
  });

  it("keeps the page in English for a browser in another language", async () => {
    const dates = await withBrowser(["de-DE"]);
    expect(dates.siteLocale()).toMatch(/^en-(GB|US)$/);
    expect(dates.formatDate(NOV_9)).toMatch(/Nov/);
    expect(dates.formatDate(NOV_9)).not.toMatch(/\./);
  });
});

describe("formatDate and friends", () => {
  it("writes the month as a word, never an all-number date", () => {
    expect(formatDate(NOV_9)).toBe("Nov 9, 2026");
    // Pages pass ISO strings from the database.
    expect(formatDate(NOV_9.toISOString())).toBe("Nov 9, 2026");
    expect(formatDate(NOV_9, { month: "long" })).toBe("November 9, 2026");
    expect(formatDay(NOV_9)).toBe("Nov 9");
    expect(formatDay(NOV_9, { year: "2-digit" })).toBe("Nov 9, 26");
  });

  it("adds the time on the visitor's clock", () => {
    expect(formatDateTime(NOV_9)).toMatch(/^Nov 9, 2026, \d{1,2}:\d{2} [AP]M$/);
  });

  it("gives a weekly moment on any clock", () => {
    const turnover = new Date("2026-11-30T19:00:00Z");
    expect(formatWeekdayTime(turnover, { timeZone: "Europe/London" })).toBe("Monday 7:00 PM");
    expect(formatWeekdayTime(turnover, { timeZone: "America/New_York" })).toBe("Monday 2:00 PM");
    expect(formatWeekdayTime(turnover, { timeZone: "Australia/Sydney" })).toBe("Tuesday 6:00 AM");
  });

  it("is empty for a missing or broken date", () => {
    for (const format of [formatDate, formatDay, formatDateTime, formatWeekdayTime, localWhen, localIsoDate]) {
      expect(format(null)).toBe("");
      expect(format("not a date")).toBe("");
    }
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});

describe("localWhen", () => {
  // Local midday, so a few hours either way stays on the same local date.
  const noon = new Date(2026, 10, 20, 12).getTime();
  const hour = 60 * 60 * 1000;

  it("says today, tomorrow or yesterday for near times, in any time zone", () => {
    expect(localWhen(noon + hour, noon)).toMatch(/^today, /);
    expect(localWhen(noon + 24 * hour, noon)).toMatch(/^tomorrow, /);
    expect(localWhen(noon - 24 * hour, noon)).toMatch(/^yesterday, /);
  });

  it("gives the day and date further out", () => {
    expect(localWhen(new Date(2026, 10, 30, 19), noon)).toBe("Mon, Nov 30, 7:00 PM");
  });
});

describe("calendarDay", () => {
  it("keeps a date field's day, whatever the visitor's clock", () => {
    // A goal due 1 Dec, as Supabase stores the date field's "2026-12-01".
    const due = calendarDay("2026-12-01T00:00:00+00:00");
    expect(localIsoDate(due)).toBe("2026-12-01");
    expect(formatDate(due)).toBe("Dec 1, 2026");
    // A DATE column's value parses the same way.
    expect(formatDay(calendarDay("2026-12-01"))).toBe("Dec 1");
  });

  it("is null for a missing or broken date", () => {
    expect(calendarDay(null)).toBeNull();
    expect(calendarDay("not a date")).toBeNull();
  });
});

describe("localIsoDate", () => {
  it("is the date on the visitor's clock, in a date field's shape", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(localIsoDate(new Date(2026, 11, 31, 0, 15))).toBe("2026-12-31");
  });

  it("is today by default", () => {
    const now = new Date();
    expect(localIsoDate()).toBe(localIsoDate(now));
  });
});
