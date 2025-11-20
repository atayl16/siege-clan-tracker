/**
 * Shared fetcher utilities for SWR hooks
 */

/**
 * Get API headers including authentication
 * @returns {HeadersInit} Headers object with API key if configured
 */
function getApiHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add API key if configured (VITE_ prefix required for client-side access)
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  return headers;
}

/**
 * JSON fetcher with enhanced error handling and authentication
 * @param {string} url - The URL to fetch
 * @returns {Promise<any>} The JSON response
 * @throws {Error} Enhanced error with response details
 */
export const jsonFetcher = async (url) => {
  const res = await fetch(url, {
    headers: getApiHeaders(),
  });

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
