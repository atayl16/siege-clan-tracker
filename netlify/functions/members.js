const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function(event, context) {
  // Debug logs (moved inside the handler function)
  console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log(
    "SUPABASE_SERVICE_ROLE_KEY exists:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

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
      .select('*')
      .is('left_date', null);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
