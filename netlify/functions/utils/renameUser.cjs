/**
 * Rename a user's account: users.username and the Supabase Auth email that
 * login signs in with.
 *
 * Login (AuthContext) looks the account up by users.username, checks the
 * password hash, then signs in to Supabase Auth as `<username>@example.com`.
 * Both have to change together, or the user is left able to log in without a
 * Supabase session (and everything RLS gates on auth.uid() stops working).
 * So the auth email changes first, and is put back if the users row cannot
 * be updated.
 *
 * Kept free of request handling so it can be tested with a stand-in client.
 */

// Lowercase letters, digits, dot, dash and underscore; must start and end
// with a letter or digit. The name becomes the local part of an email
// address, so anything outside this set would be rejected by Supabase Auth.
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,22})[a-z0-9]$/;

const loginEmail = (username) => `${username}@example.com`;

function normaliseUsername(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

/** @returns {string|null} an error message, or null when the name is valid */
function validateUsername(username) {
  if (username.length < 3 || username.length > 24) {
    return 'Usernames must be 3 to 24 characters.';
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use only letters, numbers, dots, dashes and underscores, starting and ending with a letter or number.';
  }
  return null;
}

class RenameError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * An unexpected failure, labelled with the step it happened in, so the
 * response and the function log say where a rename broke rather than only
 * "Failed to change username".
 */
class RenameStepError extends Error {
  constructor(step, cause) {
    super(`${step}: ${cause?.message || String(cause)}`);
    this.step = step;
    this.cause = cause;
  }
}

/**
 * @param {object} args
 * @param {object} args.supabase - service-role client
 * @param {object} args.authUser - the caller, from supabase.auth.getUser(token)
 * @param {string} args.newUsername - requested name, as typed
 * @returns {Promise<{ username: string }>}
 * @throws {RenameError}
 */
async function renameUser({ supabase, authUser, newUsername }) {
  // The built-in admin login signs in to Supabase Auth with this fixed email
  // (AuthContext), so changing it would lock that login out.
  if (authUser.email === 'admin@siegeclan.org') {
    throw new RenameError('The built-in admin account cannot be renamed.', 403);
  }

  const username = normaliseUsername(newUsername);
  const invalid = validateUsername(username);
  if (invalid) throw new RenameError(invalid, 400);

  // Accounts are created with users.id = auth user id; supabase_auth_id
  // covers accounts linked afterwards.
  const { data: rows, error: findError } = await supabase
    .from('users')
    .select('id, username')
    .or(`id.eq.${authUser.id},supabase_auth_id.eq.${authUser.id}`)
    .limit(1);
  if (findError) throw new RenameStepError('finding your account', findError);
  const account = rows?.[0];
  if (!account) throw new RenameError('No account is linked to this login.', 404);

  if (account.username === username) {
    throw new RenameError('That is already your username.', 400);
  }

  const { data: taken, error: takenError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1);
  if (takenError) throw new RenameStepError('checking the name is free', takenError);
  if (taken?.length) throw new RenameError('That username is taken.', 409);

  const previousEmail = authUser.email;
  const { error: authError } = await supabase.auth.admin.updateUserById(authUser.id, {
    email: loginEmail(username),
    email_confirm: true,
  });
  if (authError) {
    // Another auth account already has that email: the name is taken, even
    // if no users row shows it.
    if (/already|registered|exists/i.test(authError.message || '')) {
      throw new RenameError('That username is taken.', 409);
    }
    throw new RenameStepError('updating your login email', authError);
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ username })
    .eq('id', account.id);
  if (updateError) {
    // Put the login email back so the old username still signs in.
    await supabase.auth.admin.updateUserById(authUser.id, {
      email: previousEmail,
      email_confirm: true,
    });
    if (updateError.code === '23505') throw new RenameError('That username is taken.', 409);
    throw new RenameStepError('saving the new username', updateError);
  }

  return { username };
}

module.exports = {
  renameUser,
  validateUsername,
  normaliseUsername,
  loginEmail,
  RenameError,
  RenameStepError,
};
