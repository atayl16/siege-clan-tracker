const { checkRunewatch } = require('../../scripts/sync-tasks/runewatch-check.cjs');

exports.handler = async function(event, context) {
  try {
    // Run the existing function
    const results = await checkRunewatch();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        matchedMembers: results.matchedMembers || [],
        newlyReportedMembers: results.newlyReportedMembers || []
      })
    };
  } catch (error) {
    console.error('RuneWatch check error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
