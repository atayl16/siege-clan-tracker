import useSWR from "swr";
import { jsonFetcher } from "../utils/fetchers";

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

  return {
    claimRequests: data || [],
    userClaims,
    loading: !data && !error,
    error,
    refresh: mutate,
    refreshUserClaims: mutate,
  };
}
