/**
 * Account usernames. A username is also the local part of the Supabase Auth
 * email the account signs in with (`<username>@example.com`), so it can hold
 * only characters an email address accepts. A space cannot, which is why
 * signing up as "Test user" used to fail with an invalid-email error.
 *
 * So a typed name is stored with its spaces as underscores ("Test user" becomes
 * "test_user"), and shown with them as spaces again (displayUsername in
 * stringUtils.js). Login and rename apply the same rule, so "Test user" and
 * "test_user" both sign in to the same account. OSRS treats a space and an
 * underscore in a name as the same character too.
 *
 * netlify/functions/utils/renameUser.cjs repeats these rules (it is
 * CommonJS) and is what enforces them for a rename.
 */

// Lowercase letters, digits, dot, dash and underscore; must start and end
// with a letter or digit.
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,22})[a-z0-9]$/;

/** A name as typed, as it is stored: trimmed, lowercase, spaces as "_". */
export function normaliseUsername(raw) {
  return String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

/** @returns {string|null} what is wrong with a normalised name, or null */
export function usernameProblem(name) {
  if (name.length < 3 || name.length > 24) return "Usernames must be 3 to 24 characters.";
  if (!USERNAME_PATTERN.test(name)) {
    return "Use only letters, numbers, spaces, dots, dashes and underscores, starting and ending with a letter or number.";
  }
  return null;
}

/**
 * Signup's check. Looser than usernameProblem: signup has never had a length
 * rule, and members with short names (OSRS allows one character) already
 * have accounts. It only rejects what the auth email cannot hold.
 * @returns {string|null}
 */
export function signupUsernameProblem(name) {
  if (!name) return "Enter a username.";
  if (!/^[a-z0-9._-]+$/.test(name)) {
    return "Use only letters, numbers, spaces, dots, dashes and underscores.";
  }
  return null;
}
