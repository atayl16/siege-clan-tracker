const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers');

// Validate environment variables at module load
validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function(event, context) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    // Only allow POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Validate authentication
    const authError = await validateAuth(event);
    if (authError) {
      return authError;
    }

    // Parse request body
    const parseResult = parseRequestBody(event.body);
    if (parseResult.error) {
      return {
        statusCode: parseResult.statusCode,
        headers,
        body: JSON.stringify({ error: parseResult.error }),
      };
    }

    const { memberData } = parseResult.data;

    // Validate required fields
    if (!memberData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Member data is required' }),
      };
    }

    if (!memberData.wom_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'WOM ID is required' }),
      };
    }

    // Prepare member data with defaults
    const newMember = {
      wom_id: memberData.wom_id,
      name: memberData.name || memberData.wom_name || 'Unknown',
      wom_name: memberData.wom_name || memberData.name || 'unknown',
      womrole: memberData.womrole || 'opal',
      join_date: memberData.join_date || new Date().toISOString(),
      first_xp: memberData.first_xp || 0,
      first_lvl: memberData.first_lvl || 0,
      current_xp: memberData.current_xp || memberData.first_xp || 0,
      current_lvl: memberData.current_lvl || memberData.first_lvl || 0,
      ehb: memberData.ehb || 0,
      siege_score: memberData.siege_score || 0,
      hidden: memberData.hidden || false,
      runewatch_whitelisted: memberData.runewatch_whitelisted || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert new member (service role bypasses RLS)
    const { data, error } = await supabase
      .from('members')
      .insert([newMember])
      .select();

    if (error) {
      // Check for duplicate key error
      if (error.code === '23505') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'A member with this WOM ID already exists' }),
        };
      }
      throw error;
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, data: data[0] }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to create member');
  }
};
