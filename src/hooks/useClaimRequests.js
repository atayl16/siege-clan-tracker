import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * Claim requests, for both the member view and the admin queue.
 *
 * Previously this fetched /api/claim-requests with SWR and returned
 * { claimRequests }. Every consumer destructured { requests, processRequest,
 * createClaimRequest } instead, so all three were undefined - which is why the
 * profile Requests tab crashed on `userRequests.map` and the admin queue showed
 * "Error loading requests". The endpoint answered 401 anyway: the edge function
 * behind /api/* wants an API key the browser never sends.
 *
 * Members read their own requests directly through supabase-js, scoped by
 * claim_requests_read_own. Admins cannot use that path - RLS would hide
 * everyone else's - so the admin queue goes through a Netlify function running
 * with the service role, the same as every other admin operation here.
 *
 * @param {object} [options]
 * @param {boolean} [options.admin] - load every request instead of your own
 */
export function useClaimRequests({ admin = false } = {}) {
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** Auth headers for the admin endpoints, mirroring useMembers. */
  const adminHeaders = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Missing Supabase session token for admin request");
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (admin) {
        const response = await fetch("/.netlify/functions/admin-claim-requests", {
          headers: { "Content-Type": "application/json", ...(await adminHeaders()) },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load claim requests");
        }
        const result = await response.json();
        setRequests(result.data ?? []);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("claim_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data ?? []);
    } catch (err) {
      console.error("Error fetching claim requests:", err);
      setError(err);
      // Always an array. Returning undefined is what crashed the callers.
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [admin, adminHeaders]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /**
   * Raise a claim request. RLS pins it to the caller, so a request cannot be
   * filed in someone else's name.
   *
   * @param {object} request - { user_id, wom_id, rsn, message, status }
   */
  const createClaimRequest = useCallback(
    async (request) => {
      const { data, error: insertError } = await supabase
        .from("claim_requests")
        .insert([{ status: "pending", ...request }])
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchRequests();
      return data;
    },
    [fetchRequests]
  );

  /**
   * Approve or deny a request. Approving also creates the player_claim, which
   * is why this goes through a function with the service role rather than a
   * direct write.
   */
  const processRequest = useCallback(
    async (requestId, action, adminNotes, userId, womId) => {
      const response = await fetch(
        "/.netlify/functions/admin-process-claim-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await adminHeaders()),
          },
          body: JSON.stringify({ requestId, action, adminNotes, userId, womId }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to process claim request");
      }

      const result = await response.json();
      await fetchRequests();
      return result.data;
    },
    [adminHeaders, fetchRequests]
  );

  const all = requests ?? [];

  return {
    requests: all,
    // Kept so anything still reading the old name gets an array rather than
    // undefined.
    claimRequests: all,
    loading,
    error,
    refresh: fetchRequests,
    createClaimRequest,
    processRequest,
  };
}
