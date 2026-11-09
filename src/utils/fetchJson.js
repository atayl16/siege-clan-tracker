/**
 * SWR fetcher for the /api endpoints: parse JSON, but treat a failed
 * response as an error.
 *
 * The hooks used `fetch(url).then((r) => r.json())`, which hands an error
 * body such as {"error":"WOM API Error: 429"} to the page as if it were the
 * data. When Wise Old Man rate-limited, Stats then showed blank labels and
 * zeros ("0 total members") instead of an error or the last good numbers.
 */
export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}
