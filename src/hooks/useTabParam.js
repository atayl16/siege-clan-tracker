import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * A page's open tab, kept in ?tab= so a link can open it (from Discord, say)
 * and a reload keeps it. The first tab is the default and leaves the URL
 * clean. Switching tabs replaces the history entry, so Back leaves the page
 * rather than stepping back through its tabs.
 *
 * @param {string[]} tabs - the tab ids, default first
 * @returns {[string, (tab: string) => void]}
 */
export function useTabParam(tabs) {
  const [params, setParams] = useSearchParams();
  const fallback = tabs[0];
  const requested = params.get("tab");
  const tab = tabs.includes(requested) ? requested : fallback;

  const setTab = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next === fallback) updated.delete("tab");
          else updated.set("tab", next);
          return updated;
        },
        { replace: true }
      );
    },
    [setParams, fallback]
  );

  return [tab, setTab];
}
