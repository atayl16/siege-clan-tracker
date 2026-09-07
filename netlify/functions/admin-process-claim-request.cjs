const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Approve or deny a claim request.
 *
 * Approving also creates the player_claim, which is the whole point of the
 * request - without it the member gets an "approved" row and still owns
 * nothing. Both tables are service-role only, so this cannot be done from the
 * browser.
 *
 * Body: { requestId, action: 'approved'|'denied', adminNotes?, userId, womId }
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const authError = await validateAuth(event);
    if (authError) return authError;

    const parsed = parseRequestBody(event.body);
    if (parsed.error) {
      return {
        statusCode: parsed.statusCode,
        headers,
        body: JSON.stringify({ error: parsed.error }),
      };
    }

    const { requestId, action, adminNotes, userId, womId } = parsed.data;

    if (!requestId || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'requestId and action are required' }),
      };
    }

    if (!['approved', 'denied'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "action must be 'approved' or 'denied'" }),
      };
    }

    if (action === 'approved') {
      if (!userId || !womId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'userId and womId are required to approve' }),
        };
      }

      // Refuse rather than hand the same player to two members. The unique
      // constraint on player_claims only covers (user_id, wom_id), so it would
      // not catch a second member claiming the same player.
      const { data: existing, error: existingError } = await supabase
        .from('player_claims')
        .select('id')
        .eq('wom_id', womId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'That player has already been claimed' }),
        };
      }

      const { error: claimError } = await supabase
        .from('player_claims')
        .insert([{ user_id: userId, wom_id: womId }]);

      if (claimError) throw claimError;
    }

    const { data, error } = await supabase
      .from('claim_requests')
      .update({
        status: action,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to process claim request');
  }
};
