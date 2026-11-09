const crypto = require('crypto');

/**
 * Password changes for the app's own login.
 *
 * A password lives in two places, and login (AuthContext) uses both:
 *   1. users.password_hash - unsalted SHA-256 hex, compared in the browser;
 *      matches crypto-hash's sha256() there
 *   2. the Supabase Auth password - used to open the Supabase session that
 *      RLS (auth.uid()) depends on
 * Changing only one leaves the member either unable to log in or logged in
 * without a session, so setPassword changes both.
 *
 * Kept free of request handling so it can be tested with a stand-in client.
 */

const sha256Hex = (text) => crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');

// No 0/o, 1/l/i: temporary passwords are read out or retyped by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * A random temporary password like "k7mq-x2dp-9rtw-hb4e": 16 characters from
 * a 31-character alphabet, about 79 bits. Long and random on purpose: its
 * hash is stored the same way as every other password.
 */
function generateTempPassword() {
  const chars = [];
  for (let i = 0; i < 16; i++) chars.push(ALPHABET[crypto.randomInt(ALPHABET.length)]);
  return chars.join('').match(/.{4}/g).join('-');
}

/** @returns {string|null} an error message, or null if acceptable */
function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Passwords must be at least 8 characters.';
  }
  if (password.length > 72) return 'Passwords can be at most 72 characters.';
  return null;
}

// The built-in admin login (AuthContext) signs in to Supabase Auth with a
// password derived from the hard-coded admin password, through a users row
// named "admin". Changing its password would lock that login out, so it is
// never changed here, by anyone.
const PROTECTED_USERNAMES = new Set(['admin']);
const isProtectedAccount = (account) => PROTECTED_USERNAMES.has(String(account?.username).toLowerCase());

class PasswordError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Look up a users row by its id, or by the Supabase Auth id linked to it.
 * @returns {Promise<{id, username, password_hash, supabase_auth_id}>}
 */
async function findAccount(supabase, { userId, authUserId }) {
  const query = supabase.from('users').select('id, username, password_hash, supabase_auth_id');
  const { data, error } = await (userId
    ? query.eq('id', userId).limit(1)
    : query.or(`id.eq.${authUserId},supabase_auth_id.eq.${authUserId}`).limit(1));
  if (error) throw error;
  if (!data?.[0]) throw new PasswordError('Account not found.', 404);
  return data[0];
}

/**
 * Set a member's password in both places. The Supabase Auth password goes
 * first: if it fails nothing has changed. If the hash update then fails, the
 * member can still log in with their old password but gets no session until
 * the change is retried, which the error says.
 */
async function setPassword(supabase, account, password) {
  const authId = account.supabase_auth_id || account.id;
  const { error: authError } = await supabase.auth.admin.updateUserById(authId, { password });
  if (authError) {
    throw new PasswordError(`Could not update the login password: ${authError.message}`, 500);
  }

  const { error: hashError } = await supabase
    .from('users')
    .update({ password_hash: sha256Hex(password) })
    .eq('id', account.id);
  if (hashError) {
    throw new PasswordError(
      `The password was only partly updated (${hashError.message}). Try again.`,
      500
    );
  }
}

/** Admin reset: give the account a new random password and return it. */
async function resetPassword(supabase, userId) {
  if (!userId) throw new PasswordError('Choose a user to reset.', 400);
  const account = await findAccount(supabase, { userId });
  if (isProtectedAccount(account)) {
    throw new PasswordError("The built-in admin account's password cannot be changed.", 403);
  }
  const temporaryPassword = generateTempPassword();
  await setPassword(supabase, account, temporaryPassword);
  return { username: account.username, temporaryPassword };
}

/** Self-service change: the caller proves their current password first. */
async function changeOwnPassword(supabase, authUser, currentPassword, newPassword) {
  const account = await findAccount(supabase, { authUserId: authUser.id });
  if (isProtectedAccount(account)) {
    throw new PasswordError("The built-in admin account's password cannot be changed.", 403);
  }
  if (sha256Hex(currentPassword ?? '') !== account.password_hash) {
    throw new PasswordError('Your current password is not right.', 403);
  }
  const invalid = validateNewPassword(newPassword);
  if (invalid) throw new PasswordError(invalid, 400);
  if (newPassword === currentPassword) {
    throw new PasswordError('Choose a password different from your current one.', 400);
  }
  await setPassword(supabase, account, newPassword);
  return { ok: true };
}

module.exports = {
  sha256Hex,
  generateTempPassword,
  validateNewPassword,
  resetPassword,
  changeOwnPassword,
  PasswordError,
  isProtectedAccount,
};
