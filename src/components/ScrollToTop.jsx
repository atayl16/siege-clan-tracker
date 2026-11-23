import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Start each new page at the top. The router keeps the scroll position, so a
 * footer link opened the next page at its bottom. Links to a section (#privacy)
 * scroll there instead, and Back/Forward keep the browser's own position.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash || navigationType === "POP") return;
    window.scrollTo(0, 0);
    // Only a new page: a changed ?tab= or #section is the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
