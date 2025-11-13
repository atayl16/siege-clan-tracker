import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";
import { supabase } from "../supabaseClient";

export function useClaimRequests(userId) {
  const { data, error, mutate } = useSWR("/api/claim-requests", jsonFetcher, {
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
      // Update the request status
      const { error: updateError } = await supabase
        .from("claim_requests")
        .update({
          status: action,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) {
        throw new Error(updateError.message || "Failed to update request status");
      }

      // If approved, create the player claim
      if (action === "approved" && userId && womId) {
        const { error: claimError } = await supabase
          .from("player_claims")
          .insert([{
            user_id: userId,
            wom_id: womId,
          }]);

        if (claimError) {
          throw new Error(claimError.message || "Failed to create player claim");
        }
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
