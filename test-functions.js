require('dotenv').config(); // Load environment variables from .env
const { handler: syncWomHandler } = require('./netlify/functions/sync-wom');
const { handler: womEventsHandler } = require('./netlify/functions/wom-events');
const { handler: runewatchHandler } = require('./netlify/functions/runewatch-check');

// Mock event object
const mockEvent = {
  httpMethod: 'GET',
  headers: {},
  body: null
};

// Mock context object
const mockContext = {};

// Function to test a specific handler
async function testFunction(name, handler) {
  console.log(`\n----- Testing ${name} function -----`);
  console.log(`Environment variables loaded: ${process.env.REACT_APP_SUPABASE_URL ? '✓' : '✗'}`);
  
  try {
    const startTime = Date.now();
    const result = await handler(mockEvent, mockContext);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`Status code: ${result.statusCode}`);
    console.log(`Duration: ${duration} seconds`);
    
    if (result.statusCode === 200) {
      console.log('✅ Function completed successfully!');
      
      // Parse and show summary of result
      const data = JSON.parse(result.body);
      if (name === 'sync-wom') {
        console.log(`Updated ${data.stats?.updated || 0} members out of ${data.stats?.total || 0}`);
      } else if (name === 'wom-events') {
        console.log(`Processed ${data.length || 0} events/competitions`);
      } else if (name === 'runewatch-check') {
        console.log(`Checked against ${data.reportedCount || 0} RuneWatch entries`);
        console.log(`Found ${data.matchedMembers?.length || 0} reported clan members`);
      }
    } else {
      console.log('❌ Function returned non-200 status code');
      console.log('Response:', result.body);
    }
    
    return result.statusCode === 200;
  } catch (error) {
    console.error('❌ Error executing function:', error);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const functionToTest = args[0] || 'all';

async function runTests() {
  if (functionToTest === 'all' || functionToTest === 'sync-wom') {
    await testFunction('sync-wom', syncWomHandler);
  }
  
  if (functionToTest === 'all' || functionToTest === 'wom-events') {
    await testFunction('wom-events', womEventsHandler);
  }
  
  if (functionToTest === 'all' || functionToTest === 'runewatch-check') {
    await testFunction('runewatch-check', runewatchHandler);
  }
}

runTests();
