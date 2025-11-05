const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders } = require('./_shared/cors');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for better permissions
);

exports.handler = async (event, context) => {
  // Set CORS headers for all responses with wildcard validation
  const headers = getCorsHeaders();

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' }),
    };
  }

  try {
    // Fetch all events from Supabase
    const { data: events, error } = await supabase.from('events').select('*');
    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(events),
    };
  } catch (err) {
    console.error('Error fetching events:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch events', message: err.message }),
    };
  }
};
