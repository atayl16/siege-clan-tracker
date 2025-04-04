const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase.from('members').select('*');
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'  // Add CORS header for testing
      },
      body: JSON.stringify(data || [])
    };
  } catch (error) {
    console.error("Error in members function:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'  // Add CORS header for testing
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
