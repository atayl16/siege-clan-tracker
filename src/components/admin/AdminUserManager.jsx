import React, { useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaCopy, FaCheck, FaSearch } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { supabase } from "../../supabaseClient";
import Card from "../ui/Card";
import "./AdminUserManager.css";

// The built-in admin login's account. Its admin status and password are
// never changed from here (the server refuses too).
const isBuiltInAdmin = (user) => String(user?.username).toLowerCase() === "admin";

/**
 * Every account in one table, with that account's actions on its row:
 * grant or remove admin (confirmed first), and reset a forgotten password.
 * This replaces separate "current admins" and "promote a user" lists.
 */
export default function AdminUserManager() {
  const { user: me, toggleAdminStatus } = useAuth();
  const { users, loading, error: loadError, refresh } = useData();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [reset, setReset] = useState(null); // { username, temporaryPassword }
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? [])
      .filter((u) => !q || u.username?.toLowerCase().includes(q))
      .sort((a, b) => (b.is_admin === true) - (a.is_admin === true) || a.username.localeCompare(b.username));
  }, [users, query]);

  const setAdmin = async (target, makeAdmin) => {
    const question = makeAdmin
      ? `Make ${target.username} an admin? They will be able to edit members, approve claims and manage users.`
      : `Remove admin from ${target.username}?`;
    if (!window.confirm(question)) return;

    setBusyId(target.id);
    setMessage(null);
    try {
      const result = await toggleAdminStatus(target.id, makeAdmin);
      if (!result?.success) throw new Error(result?.error || "Failed to update admin status");
      setMessage({
        type: "success",
        text: `${target.username} is now ${makeAdmin ? "an admin" : "a regular member"}.`,
      });
      refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (target) => {
    if (!window.confirm(`Reset the password for ${target.username}? Their current password stops working.`)) {
      return;
    }
    setBusyId(target.id);
    setMessage(null);
    setReset(null);
    setCopied(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Your admin session has expired. Log out and back in.");

      const res = await fetch("/.netlify/functions/admin-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: target.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Reset failed (${res.status}).`);
      setReset(body);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reset.temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the password is on screen to copy by hand.
    }
  };

  return (
    <div className="ui-admin-user-manager">
      {/* No heading of its own: the User Management tab already has one. */}
      <Card variant="dark">
        <Card.Body>
          {message && (
            <div className={`ui-message ui-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
              {message.type === "error" ? (
                <FaExclamationTriangle className="ui-message-icon" />
              ) : (
                <FaCheckCircle className="ui-message-icon" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {reset && (
            <div className="user-reset-result" role="status">
              <p>
                New temporary password for <strong>{reset.username}</strong>. It's shown only this once:
              </p>
              <div className="user-reset-secret">
                <code>{reset.temporaryPassword}</code>
                <button type="button" onClick={copy} className="user-reset-copy">
                  {copied ? <FaCheck /> : <FaCopy />} {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" onClick={() => setReset(null)} className="user-reset-copy">
                  Done
                </button>
              </div>
              <p className="user-reset-hint">
                Send it to them privately. They can change it from Profile, then Account.
              </p>
            </div>
          )}

          <div className="user-search">
            <FaSearch className="user-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users"
            />
          </div>

          {loadError && (
            <div className="ui-message ui-message-error" role="alert">
              <FaExclamationTriangle className="ui-message-icon" />
              <span>Error loading users: {loadError.message || String(loadError)}</span>
            </div>
          )}

          {loading ? (
            <div className="ui-loading-text">Loading users...</div>
          ) : rows.length === 0 ? (
            <p className="user-empty">No users match.</p>
          ) : (
            <div className="user-table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Joined</th>
                    <th className="user-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => {
                    const builtIn = isBuiltInAdmin(u);
                    const isMe = me?.id === u.id;
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <span className="user-name">{u.username}</span>
                          {u.is_admin && <span className="user-tag user-tag-admin">Admin</span>}
                          {isMe && <span className="user-tag">You</span>}
                        </td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}</td>
                        <td className="user-actions-col">
                          {builtIn ? (
                            <span className="user-locked">Built-in admin</span>
                          ) : (
                            <>
                              {u.is_admin ? (
                                // You can't remove your own admin access here:
                                // it would lock you out of this page.
                                !isMe && (
                                  <button
                                    type="button"
                                    className="user-action user-action-danger"
                                    onClick={() => setAdmin(u, false)}
                                    disabled={busyId !== null}
                                  >
                                    Remove Admin
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="user-action"
                                  onClick={() => setAdmin(u, true)}
                                  disabled={busyId !== null}
                                >
                                  Make Admin
                                </button>
                              )}
                              <button
                                type="button"
                                className="user-action"
                                onClick={() => resetPassword(u)}
                                disabled={busyId !== null}
                              >
                                {busy ? "Working..." : "Reset Password"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
