import { useEffect, useState } from "react";
import useSWR from "swr";
import { supabase } from "../supabaseClient";

/**
 * The account list, for AdminUserManager. Admin only.
 *
 * /api/users requires an admin's Supabase session token: it used to trust the
 * Origin header and return every row, password_hash included, to anyone who
 * set one. So the request carries the token, and is not made at all unless an
 * admin is signed in - DataProvider mounts this for every visitor.
 *
 * DataProvider sits outside AuthProvider, so this cannot use useAuth(). It
 * follows the Supabase session instead, which admin login creates.
 */
async function fetchUsers([url, token]) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    // Throw, so SWR reports an error. Returning the error body as data is what
    // let { error: "..." } reach UserSelector as if it were the user list.
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load users (${res.status})`);
  }
  return res.json();
}

export function useUsers() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data?.session?.access_token ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  const isAdmin = localStorage.getItem("adminAuth") === "true";
  const key = isAdmin && token ? ["/api/users", token] : null;

  const { data, error, mutate } = useSWR(key, fetchUsers, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  return {
    users: data,
    loading: key !== null && !data && !error,
    error,
    refresh: mutate,
  };
}
