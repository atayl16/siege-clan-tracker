const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  try {
    // Fetch all events from Supabase
    const { data: events, error } = await supabase.from('events').select('*');
    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify(events),
    };
  } catch (err) {
    console.error('Error fetching events:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch events' }),
    };
  }
};
