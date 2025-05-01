import useSWR from "swr";
import claimRequests from "../../netlify/edge-functions/claim-requests";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useClaimRequests() {
  const { data, error, mutate } = useSWR("/api/claim-requests", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
  return {
    claimRequests: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
