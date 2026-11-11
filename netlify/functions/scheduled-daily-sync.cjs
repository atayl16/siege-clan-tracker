/**
 * Starts the Daily Clan Data Sync workflow on GitHub once a day, on time.
 * Schedule: netlify.toml ([functions."scheduled-daily-sync"]).
 * Scheduled functions cannot be called by URL; see utils/githubDispatch.cjs.
 */
const { scheduledDispatch } = require('./utils/githubDispatch.cjs');

exports.handler = scheduledDispatch('daily-clan-sync.yml');
