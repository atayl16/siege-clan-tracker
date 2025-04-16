const { handler: syncWomHandler } = require('./sync-wom');
const { handler: womEventsHandler } = require('./wom-events');
const { handler: runewatchHandler } = require('./runewatch-check');

exports.handler = async (event, context) => {
  console.log("🔄 Starting daily maintenance tasks...");
  const results = {
    syncWom: null,
    womEvents: null,
    runewatchCheck: null,
    errors: [],
    startTime: new Date().toISOString(),
    endTime: null,
    success: false
  };
  
  try {
    // 1. First sync with WOM to get latest member data
    console.log("Task 1/3: Syncing with Wise Old Man...");
    try {
      const syncResult = await syncWomHandler(event, context);
      results.syncWom = {
        status: syncResult.statusCode,
        data: JSON.parse(syncResult.body)
      };
      console.log(`✅ WOM Sync completed (${syncResult.statusCode})`);
    } catch (error) {
      console.error("❌ WOM Sync failed:", error);
      results.errors.push({
        task: "syncWom",
        error: error.message,
        stack: error.stack
      });
    }
    
    // 2. Then fetch events (which depends on having up-to-date data)
    console.log("Task 2/3: Fetching WOM events...");
    try {
      const eventsResult = await womEventsHandler(event, context);
      results.womEvents = {
        status: eventsResult.statusCode,
        data: JSON.parse(eventsResult.body)
      };
      console.log(`✅ WOM Events completed (${eventsResult.statusCode})`);
    } catch (error) {
      console.error("❌ WOM Events failed:", error);
      results.errors.push({
        task: "womEvents",
        error: error.message,
        stack: error.stack
      });
    }
    
    // 3. Finally check RuneWatch (also benefits from up-to-date member list)
    console.log("Task 3/3: Checking RuneWatch...");
    try {
      const runewatchResult = await runewatchHandler(event, context);
      results.runewatchCheck = {
        status: runewatchResult.statusCode,
        data: JSON.parse(runewatchResult.body)
      };
      console.log(`✅ RuneWatch check completed (${runewatchResult.statusCode})`);
    } catch (error) {
      console.error("❌ RuneWatch check failed:", error);
      results.errors.push({
        task: "runewatchCheck",
        error: error.message,
        stack: error.stack
      });
    }
    
    // Calculate success/failure status
    results.endTime = new Date().toISOString();
    const totalTasks = 3;
    const completedTasks = [results.syncWom, results.womEvents, results.runewatchCheck]
      .filter(task => task && task.status === 200).length;
    
    results.success = completedTasks === totalTasks;
    
    // Send notification about daily tasks results if needed
    await sendDailyTasksNotification(results);
    
    return {
      statusCode: results.success ? 200 : 207, // 207 Multi-Status for partial success
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error("❌ Daily tasks execution failed:", error);
    results.endTime = new Date().toISOString();
    results.errors.push({
      task: "overall",
      error: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify(results)
    };
  }
};
