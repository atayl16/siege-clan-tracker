import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "./ChangeUsername.css";

/**
 * Change your own password, e.g. after an admin reset gave you a temporary
 * one. Reuses ChangeUsername's styles; the two sit together on the Account tab.
 */
export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const close = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return setError("Passwords must be at least 8 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");

    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Your session has expired. Log out and back in, then try again.");

      const res = await fetch("/.netlify/functions/user-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not change your password (${res.status}).`);

      close();
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <>
        <button
          type="button"
          className="change-username-open"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          Change password
        </button>
        {done && <p className="change-username-hint" role="status">Password changed.</p>}
      </>
    );
  }

  return (
    <form className="change-username" onSubmit={submit}>
      <label htmlFor="current-password" className="change-username-label">Current password</label>
      <input
        id="current-password"
        type="password"
        className="change-username-input"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        autoFocus
      />
      <label htmlFor="new-password" className="change-username-label">New password</label>
      <input
        id="new-password"
        type="password"
        className="change-username-input"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
      />
      <label htmlFor="confirm-password" className="change-username-label">Confirm new password</label>
      <input
        id="confirm-password"
        type="password"
        className="change-username-input"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {error && (
        <p className="change-username-error" role="alert">
          {error}
        </p>
      )}
      <div className="change-username-actions">
        <button type="submit" className="change-username-save" disabled={saving || !current || !next}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="change-username-cancel" onClick={close} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
