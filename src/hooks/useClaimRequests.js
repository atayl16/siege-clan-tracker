import useSWR from "swr";
import { useState, useCallback } from "react";

// Improved fetcher with error handling for HTML responses
const fetcher = async (url) => {
  try {
    // Get user ID from localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    const headers = {};
    if (userId) {
      headers["Authorization"] = `Bearer ${userId}`;
    }

    const response = await fetch(url, { headers });

    // Check for HTML responses (error pages)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      console.error(`API endpoint ${url} returned HTML instead of JSON`);
      throw new Error("API endpoint returned HTML instead of JSON");
    }

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};

export function useClaimRequests() {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [userClaims, setUserClaims] = useState([]);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userId = user.id;

  // Include userId in the URL if available
  const requestsUrl = userId
    ? `/api/claim-requests?userId=${userId}`
    : "/api/claim-requests";

  const { data, error, mutate } = useSWR(requestsUrl, fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Don't retry on 404s
      if (error.status === 404) return;

      // Only retry up to 3 times
      if (retryCount >= 3) return;

      // Retry after 5 seconds
      setTimeout(() => revalidate({ retryCount }), 5000);
    },
  });

  // Create a new claim request
  const createClaimRequest = async (claimData) => {
    setMutationLoading(true);
    setMutationError(null);

    try {
      // Get user ID from localStorage for authentication
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to submit a claim request");
      }

      const response = await fetch("/api/claim-request-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          action: "create",
          claimData,
        }),
      });

      // Check for HTML responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("API endpoint returned HTML instead of JSON");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create claim request");
      }

      // Refresh the claim requests data
      await mutate();

      return result.data;
    } catch (err) {
      console.error("Create claim request error:", err);
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Process a claim request (for admins)
  const processClaimRequest = async (requestId, status, adminNotes = "") => {
    setMutationLoading(true);
    setMutationError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to process a claim request");
      }

      // Find the claim request details in the data
      const claimRequest = claimRequests.find((req) => req.id === requestId);
      if (!claimRequest) {
        throw new Error("Claim request not found");
      }

      // Include the userData explicitly in the request
      const response = await fetch("/api/claim-request-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          action: "process",
          claimData: {
            id: requestId,
            status,
            admin_notes: adminNotes,
            // Add these explicitly from the found claim request
            user_id: claimRequest.user_id,
            wom_id: claimRequest.wom_id,
          },
        }),
      });

      // Check for HTML responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("API endpoint returned HTML instead of JSON");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process claim request");
      }

      // Refresh the claim requests data
      await mutate();

      return result.data;
    } catch (err) {
      console.error("Process claim request error:", err);
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Fetch user's claims with improved error handling (wrapped in useCallback)
  const refreshUserClaims = useCallback(async (userId) => {
    if (!userId) {
      const user = JSON.parse(localStorage.getItem("user"));
      userId = user?.id;
    }

    if (!userId) {
      console.log("No user ID available for fetching claims");
      setUserClaims([]);
      return [];
    }

    try {
      console.log("Fetching claims for user:", userId);

      const response = await fetch(`/api/user-claims?userId=${userId}`);

      // Check for HTML response (error page)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.error(
          "Received HTML instead of JSON - API endpoint likely missing"
        );
        setUserClaims([]);
        return [];
      }

      if (!response.ok) {
        console.error(
          `API error ${response.status}: Failed to fetch user claims`
        );
        setUserClaims([]);
        return [];
      }

      const data = await response.json();
      console.log("User claims fetched successfully:", data.length);
      setUserClaims(data);
      return data;
    } catch (err) {
      console.error("Error fetching user claims:", err);
      setUserClaims([]);
      return [];
    }
  }, []);

  return {
    requests: data
      ? data.map((req) => ({
          ...req,
          username:
            req.username || (req.requester && req.requester.username) || null,
        }))
      : [],
    loading: (!data && !error) || mutationLoading,
    error: error || mutationError,
    refresh: mutate,
    createClaimRequest,
    processClaimRequest,
    userClaims,
    refreshUserClaims,
  };
}
