/**
 * Shared fetcher utilities for SWR hooks
 */

/**
 * JSON fetcher with enhanced error handling
 * @param {string} url - The URL to fetch
 * @returns {Promise<any>} The JSON response
 * @throws {Error} Enhanced error with response details
 */
export const jsonFetcher = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    // Try to get error details from response body
    let errorBody = '';
    try {
      errorBody = await res.text();
    } catch (e) {
      // If we can't read the body, just use status text
      errorBody = res.statusText;
    }

    // Create enhanced error message with all relevant details
    const errorMessage = `HTTP ${res.status} error for ${url}: ${errorBody || res.statusText}`;
    throw new Error(errorMessage);
  }

  return res.json();
};
