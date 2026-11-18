import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { normaliseUsername, usernameProblem } from "../utils/username";
import "./ChangeUsername.css";

// netlify/functions/utils/renameUser.cjs enforces the same rule; it is
// checked here only to give a quick answer before the request.
export { usernameProblem };

/**
 * Lets a member change their username, e.g. if they used their real name.
 * The new name is also what they log in with from then on.
 */
export default function ChangeUsername({ currentUsername, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setEditing(false);
    setValue("");
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const name = normaliseUsername(value);
    const problem = name === currentUsername ? "That is already your username." : usernameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Your session has expired. Log out and back in, then try again.");

      const res = await fetch("/.netlify/functions/user-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not change your username (${res.status}).`);

      onRenamed(body.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button type="button" className="change-username-open" onClick={() => setEditing(true)}>
        Change username
      </button>
    );
  }

  return (
    <form className="change-username" onSubmit={submit}>
      <label htmlFor="new-username" className="change-username-label">
        New username
      </label>
      <input
        id="new-username"
        className="change-username-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="username"
        autoFocus
        maxLength={24}
      />
      <p className="change-username-hint">
        You'll log in with this name from now on. Your password stays the same.
      </p>
      {error && (
        <p className="change-username-error" role="alert">
          {error}
        </p>
      )}
      <div className="change-username-actions">
        <button type="submit" className="change-username-save" disabled={saving || !value.trim()}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="change-username-cancel" onClick={reset} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
