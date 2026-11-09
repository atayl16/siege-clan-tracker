import React, { useState } from "react";
import { FaKey, FaCopy, FaCheck } from "react-icons/fa";
import { supabase } from "../../supabaseClient";
import UserSelector from "../UserSelector";
import Card from "../ui/Card";
import Button from "../ui/Button";
import "./AdminPasswordReset.css";

/**
 * Reset a member's password when they've forgotten it. The server makes a
 * random temporary password and it is shown here once; the admin passes it
 * on, and the member changes it from their Account tab.
 */
export default function AdminPasswordReset() {
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { username, temporaryPassword }
  const [copied, setCopied] = useState(false);

  const select = (user) => {
    setSelected(user);
    setResult(null);
    setError(null);
    setCopied(false);
  };

  const reset = async () => {
    if (!selected) return;
    if (!window.confirm(`Reset the password for ${selected.username}? Their current password stops working.`)) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Your admin session has expired. Log out and back in.");

      const res = await fetch("/.netlify/functions/admin-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selected.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Reset failed (${res.status}).`);
      setResult(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the password is on screen to copy by hand.
    }
  };

  return (
    <Card className="admin-password-reset">
      <Card.Body>
        <h3 className="ui-section-title">
          <FaKey className="ui-icon-left" /> Reset a Member's Password
        </h3>
        <p className="ui-section-description">
          For members who forgot their password. Pick them below, reset, and send them the
          temporary password. They can change it from Profile, then Account.
        </p>

        <UserSelector onUserSelect={select} selectedUserId={selected?.id} disabled={processing} />

        {selected && (
          <div className="admin-password-reset-actions">
            <Button variant="danger" onClick={reset} disabled={processing}>
              {processing ? "Resetting..." : `Reset password for ${selected.username}`}
            </Button>
          </div>
        )}

        {error && (
          <p className="admin-password-reset-error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="admin-password-reset-result" role="status">
            <p>
              New temporary password for <strong>{result.username}</strong>. It's shown only
              this once:
            </p>
            <div className="admin-password-reset-secret">
              <code>{result.temporaryPassword}</code>
              <button type="button" onClick={copy} className="admin-password-reset-copy">
                {copied ? <FaCheck /> : <FaCopy />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="admin-password-reset-hint">
              Send it to them privately, and ask them to change it after logging in.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
