import useSWR from "swr";

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

export function useClaimRequests(userId) {
  const { data, error, mutate } = useSWR("/api/claim-requests", fetcher, {
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
