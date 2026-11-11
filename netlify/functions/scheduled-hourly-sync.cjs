/**
 * Starts the Hourly Clan Data Sync workflow on GitHub every hour, on time.
 * Schedule: netlify.toml ([functions."scheduled-hourly-sync"]).
 * Scheduled functions cannot be called by URL; see utils/githubDispatch.cjs.
 */
const { scheduledDispatch } = require('./utils/githubDispatch.cjs');

exports.handler = scheduledDispatch('hourly-clan-sync.yml');
