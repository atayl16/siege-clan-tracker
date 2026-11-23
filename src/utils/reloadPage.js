/**
 * Load the home page afresh. Used when a sign-out never finishes: a full load
 * drops the stuck request with the old page, so it cannot touch a session
 * made after it. Its own module so tests can replace it.
 */
export function reloadPage() {
  window.location.assign("/");
}
