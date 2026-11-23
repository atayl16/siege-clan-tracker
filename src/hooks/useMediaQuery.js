import { useEffect, useState } from "react";

/**
 * Whether a CSS media query matches, kept up to date as the window changes.
 * Used to leave out parts of a page that a screen size hides anyway, so
 * they fetch nothing there.
 *
 * @param {string} query e.g. "(min-width: 1101px)"
 */
export function useMediaQuery(query) {
  const get = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}
