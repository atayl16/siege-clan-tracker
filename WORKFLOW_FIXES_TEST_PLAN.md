# GitHub Actions Workflow Fixes - Test Plan

## Summary of Changes

This PR implements **Prompt #3** from TASKS.md: Fix GitHub Actions workflows with proper error handling and Discord notifications.

### Problems Fixed

1. **Silent Failures:** Jobs had `continue-on-error: true`, allowing failures to go unnoticed
2. **Unused Conditionals:** Scheduled workflows referenced `github.event.inputs` which doesn't exist
3. **Inconsistent Configuration:** Mixed use of `vars.WOM_GROUP_ID` and `secrets.WOM_GROUP_ID`
4. **Missing Jobs:** Daily workflow was missing WOM sync jobs
5. **No Failure Notifications:** No way to know when sync jobs fail
6. **Complex Run Names:** Nested ternary logic hard to read

## Changes Made

### 1. daily-clan-sync.yml

**Fixed:**
- ✅ Removed unused `github.event.inputs` conditionals
- ✅ Changed `continue-on-error: true` to `false` for all jobs
- ✅ Added Discord notification on failure
- ✅ Improved success summary message
- ✅ Kept schedule: Daily at 2pm UTC

**Job Coverage:**
- Anniversary Notifications (once per day)
- RuneWatch Check (once per day)

### 2. hourly-clan-sync.yml

**Fixed:**
- ✅ Removed unused `github.event.inputs` conditionals
- ✅ Changed `continue-on-error: true` to `false` for all jobs
- ✅ Added Discord notification on failure
- ✅ Improved success summary message
- ✅ Consistent use of `secrets.WOM_GROUP_ID` (removed vars fallback)

**Job Coverage:**
- WOM member sync (high-priority data, every hour)
- WOM events sync (high-priority data, every hour)

### 3. manual-clan-sync.yml

**Fixed:**
- ✅ Changed `continue-on-error: true` to `false` for all jobs
- ✅ Simplified `run-name` from nested ternary to simple template
- ✅ Consistent use of `secrets.WOM_GROUP_ID` only (removed vars fallback)
- ✅ Fixed conditional logic (removed unnecessary `github.event_name == 'schedule'` check)
- ✅ Added Discord notification on failure
- ✅ Added job name to Discord notification for better debugging

**Job Coverage:**
- All jobs individually selectable (wom-sync, wom-events, runewatch, anniversaries, all)

## Workflow Schedule Summary

| Workflow | Trigger | Jobs | Frequency |
|----------|---------|------|-----------|
| Hourly Sync | Cron: `0 * * * *` | WOM Sync, WOM Events | Every hour |
| Daily Sync | Cron: `0 14 * * *` | Anniversaries, RuneWatch | Daily at 2pm UTC |
| Manual Sync | workflow_dispatch | All (user selectable) | On demand |

## Discord Notifications

All workflows now send Discord notifications on failure with:

### Notification Content:
- **Title:** Workflow name + "Failed" (with ❌ emoji)
- **Description:** Clear failure message
- **Color:** Red (15158332)
- **Fields:**
  - Workflow name
  - Job name (manual sync only)
  - Run ID for tracking
- **URL:** Direct link to GitHub Actions run

### Example Notification:
```json
{
  "embeds": [{
    "title": "❌ Daily Clan Sync Failed",
    "description": "The daily clan sync workflow has failed. Check GitHub Actions for details.",
    "color": 15158332,
    "fields": [
      {"name": "Workflow", "value": "Daily Clan Data Sync", "inline": true},
      {"name": "Run ID", "value": "123456789", "inline": true}
    ],
    "url": "https://github.com/user/repo/actions/runs/123456789"
  }]
}
```

## Error Handling Improvements

### Before:
```yaml
- name: Run WOM Sync
  run: node scripts/sync-tasks/sync-wom.cjs
  continue-on-error: true  # ❌ Failures ignored
```

### After:
```yaml
- name: Run WOM Sync
  run: node scripts/sync-tasks/sync-wom.cjs
  continue-on-error: false  # ✅ Failures stop workflow

# ... at end of workflow ...
- name: Notify Discord on Failure
  if: failure()
  run: |
    curl ... # Send notification
```

**Impact:**
- Failures now stop the workflow immediately
- Discord notification sent automatically
- Clear visibility into sync job health

## Testing Checklist

### Pre-Deployment Testing

#### Syntax Validation
- [ ] Validate YAML syntax for all three workflows
- [ ] Check for proper indentation
- [ ] Verify all environment variables are correct
- [ ] Ensure curl command syntax is correct

### Post-Deployment Testing

#### Daily Sync Workflow
- [ ] **Test Scheduled Run**
  - Wait for 2pm UTC or manually trigger via GitHub Actions
  - Verify both jobs run (anniversaries, runewatch)
  - Check job logs for success
  - Verify no Discord notification sent on success

- [ ] **Test Failure Scenario**
  - Temporarily break a sync script (e.g., invalid env var)
  - Trigger workflow
  - Verify workflow fails immediately
  - Verify Discord notification received
  - Verify notification includes correct details
  - Fix script and verify next run succeeds

#### Hourly Sync Workflow
- [ ] **Test Scheduled Run**
  - Wait for top of hour or manually trigger
  - Verify both jobs run (wom-sync, wom-events)
  - Check job logs for success
  - Verify data synced to database
  - Verify no Discord notification sent on success

- [ ] **Test Failure Scenario**
  - Temporarily break a sync script
  - Trigger workflow
  - Verify workflow fails immediately
  - Verify Discord notification received
  - Fix script and verify next run succeeds

#### Manual Sync Workflow
- [ ] **Test Individual Jobs**
  - Trigger with `wom-sync` option
  - Verify only WOM sync runs
  - Repeat for each option (wom-events, runewatch, anniversaries)

- [ ] **Test All Jobs**
  - Trigger with `all` option
  - Verify all four jobs run in order
  - Check logs for each job
  - Verify data synced correctly

- [ ] **Test Failure Notifications**
  - Temporarily break one job
  - Trigger manual sync with that job
  - Verify Discord notification includes job name
  - Verify notification link works
  - Fix and re-test

#### Discord Integration
- [ ] Verify DISCORD_WEBHOOK_URL secret is set
- [ ] Test notification format renders correctly in Discord
- [ ] Verify clickable links work
- [ ] Verify color coding (red for failures)
- [ ] Test notification during off-hours (ensure not rate-limited)

#### Environment Variables
- [ ] Verify all required secrets exist:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - WOM_API_KEY
  - WOM_GROUP_ID
  - DISCORD_WEBHOOK_URL
  - DISCORD_ANNIVERSARY_WEBHOOK_URL

### Monitoring (First Week)

#### Daily Monitoring
- [ ] Check GitHub Actions tab daily for workflow runs
- [ ] Monitor Discord channel for failure notifications
- [ ] Review job logs for any warnings or errors
- [ ] Verify data sync is working correctly

#### Weekly Review
- [ ] Review all workflow runs for patterns
- [ ] Check for any intermittent failures
- [ ] Verify notification system is reliable
- [ ] Adjust schedules if needed based on usage

## Common Issues and Solutions

### Issue: Workflow fails immediately with syntax error
**Solution:** Check YAML syntax, especially indentation and special characters in curl command

### Issue: Discord notification not received
**Solution:**
1. Verify DISCORD_WEBHOOK_URL secret is set correctly
2. Check curl command syntax in workflow
3. Verify Discord webhook URL is still valid
4. Check GitHub Actions logs for curl errors

### Issue: Job runs but doesn't fail on errors
**Solution:**
1. Verify `continue-on-error: false` is set
2. Check that sync scripts exit with non-zero code on failure
3. Add explicit error handling in sync scripts

### Issue: WOM_GROUP_ID not found
**Solution:**
1. Ensure WOM_GROUP_ID is set in repository secrets (not variables)
2. Remove any references to `vars.WOM_GROUP_ID`
3. Verify secret is available in workflow environment

## Rollback Plan

If issues occur:

1. **Revert workflows** via Git:
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Temporarily disable failing workflow:**
   - Go to Actions tab in GitHub
   - Select workflow
   - Click "Disable workflow"

3. **Emergency fix:**
   - Edit workflow file directly in GitHub UI
   - Change `continue-on-error: false` back to `true` temporarily
   - Fix underlying issue
   - Re-enable proper error handling

## Success Criteria

- [x] All workflows use `continue-on-error: false` for critical jobs
- [x] Unused conditionals removed
- [x] WOM_GROUP_ID consistent across all workflows
- [x] Discord notifications on failure implemented
- [x] Run names simplified and clear
- [x] Workflow schedules optimized (hourly vs daily)
- [ ] All workflows tested and passing
- [ ] Discord notifications received and verified
- [ ] No silent failures in production
- [ ] Team notified of workflow changes

## Breaking Changes

⚠️ **Important:** Workflows will now fail fast instead of continuing on error.

**Impact:**
- Sync jobs that previously failed silently will now stop the workflow
- Discord notifications will be sent for all failures
- This may initially result in more notifications as hidden issues surface

**Mitigation:**
- Monitor workflows closely for first week
- Fix any underlying sync script issues promptly
- Adjust notification frequency if too noisy

## Files Changed

### Modified Files (3)
- `.github/workflows/daily-clan-sync.yml`
- `.github/workflows/hourly-clan-sync.yml`
- `.github/workflows/manual-clan-sync.yml`

**Total:** 3 files, ~90 lines changed

## Related

- **TASKS.md:** Prompt #3
- **Previous PRs:** #1 (Security Fixes), #2 (Admin Architecture)
- **Next PR:** #4 (Code Cleanup)

## Additional Notes

### Workflow Best Practices

1. **Fail Fast:** Set `continue-on-error: false` for critical operations
2. **Notify on Failure:** Always alert when automated jobs fail
3. **Clear Naming:** Use descriptive workflow and job names
4. **Consistent Variables:** Use secrets consistently, avoid mixing with vars
5. **Test Thoroughly:** Always test workflow changes in a fork first

### Future Improvements

Consider for future PRs:
- Add success rate metrics
- Implement retry logic for transient failures
- Add workflow performance monitoring
- Create separate notification channels for different severity levels
- Add workflow status badge to README
