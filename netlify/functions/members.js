const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders } = require('./_shared/cors');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function(event, context) {
  try {
    // Set CORS headers with wildcard validation
    const headers = getCorsHeaders();

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Preflight call successful' }),
      };
    }

    // Fetch data from Supabase
    const { data, error } = await supabase
      .from('members')
      .select('*');

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: error.message }),
    };
  }
};
