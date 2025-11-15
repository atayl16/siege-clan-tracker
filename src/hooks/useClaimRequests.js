import useSWR from "swr";
import { supabase } from "../supabaseClient";

// Fetcher function that queries Supabase directly
const claimRequestsFetcher = async () => {
  const { data, error } = await supabase
    .from("claim_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch claim requests");
  }

  return data;
};

export function useClaimRequests(userId) {
  const { data, error, mutate } = useSWR("claim-requests", claimRequestsFetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  // Filter claims by userId if provided, default to empty array if data is undefined
  const userClaims = userId && data
    ? data.filter(claim => claim.user_id === userId)
    : data || [];

  // Function to create a new claim request
  const createClaimRequest = async (requestData) => {
    const { data: newRequest, error: insertError } = await supabase
      .from("claim_requests")
      .insert([requestData])
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message || "Failed to create claim request");
    }

    // Refresh the data after creating
    mutate();
    return newRequest;
  };

  // Function to process (approve/deny) a claim request
  const processRequest = async (requestId, action, adminNotes, userId, womId) => {
    try {
      // Call the edge function to process the request with service role
      const API_KEY = import.meta.env.VITE_API_KEY;

      const response = await fetch('/api/process-claim-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          requestId,
          action,
          adminNotes,
          userId,
          womId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to process request: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to process request");
      }

      // Refresh the data
      mutate();
      return true;
    } catch (error) {
      console.error("Error processing request:", error);
      throw error;
    }
  };

  return {
    requests: data || [], // Export as "requests" for ClaimPlayer component
    claimRequests: data || [], // Keep for backwards compatibility
    userClaims,
    loading: !data && !error,
    error,
    refresh: mutate,
    refreshUserClaims: mutate,
    createClaimRequest,
    processRequest,
  };
}
