# Scheduled syncs

The hourly and daily syncs run on GitHub Actions
(`.github/workflows/hourly-clan-sync.yml`, `daily-clan-sync.yml`). GitHub
starts scheduled workflows when it gets to them, and for this repo that meant
the hourly sync running every 6-8 hours and the daily sync up to 7 hours late.

So two Netlify scheduled functions start them on time instead, through
GitHub's API:

| Function | Schedule (UTC) | Starts |
|---|---|---|
| `scheduled-hourly-sync` | `17 * * * *` | Hourly Clan Data Sync |
| `scheduled-daily-sync` | `43 13 * * *` | Daily Clan Data Sync |

The schedules are in `netlify.toml`. The work itself still runs on GitHub
Actions, which is free for a public repo. Each workflow keeps its own cron as
a backup. A concurrency group stops two runs overlapping, and the daily
workflow skips itself if a run already succeeded that UTC day, so
anniversary posts go out once.

Anniversary posts are currently turned off in the script itself
(`scripts/sync-tasks/anniversaries.cjs` returns at the top, logging
"Anniversary notifications are currently disabled.") because some members'
join dates are wrong. The daily run still runs that step, but it posts
nothing. When the dates are fixed and the early return is removed, the guard
above keeps the posts to once a day.

Cost on Netlify's free plan: each function runs about a second, about 750
times a month, a few credits at most.

## Setup: the GitHub token

The functions need a token that can start workflows in this repo, and nothing
else.

1. On GitHub: **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token.**
2. **Token name:** `siege-clan-tracker scheduler`. **Expiration:** the longest
   allowed. Put a reminder in your calendar to replace it before then.
3. **Repository access:** Only select repositories → `siege-clan-tracker`.
4. **Permissions → Repository permissions → Actions: Read and write.**
   Leave everything else at No access (Metadata: Read-only is added
   automatically).
5. Generate it and copy it. GitHub shows it once.
6. In Netlify: **Project configuration → Environment variables → Add a
   variable.** Key `GITHUB_DISPATCH_TOKEN`, the token as the value. Tick
   **Contains secret values**. Scopes: **All scopes** (the free plan cannot
   pick specific ones; that is fine, because no browser code reads this
   variable, so it never reaches the site's JavaScript). **Same value for
   all deploy contexts.**
7. Trigger a deploy (or wait for the next one), so the functions pick up the
   variable.

## Checking it works

- Netlify → **Cloud compute → Functions** (not Logs, and not Analytics &
  metrics → Function metrics, which only updates hourly): open
  `scheduled-hourly-sync` or `scheduled-daily-sync`. Each shows a
  **Scheduled** badge, its schedule and its next execution in your local
  time. **Run now** starts one immediately; its log should say
  `Started hourly-clan-sync.yml` (or `daily-clan-sync.yml`).
- GitHub → **Actions**: runs started this way show the event
  `workflow_dispatch`; backup runs show `schedule`.
- If the log says `Did not start ... GITHUB_DISPATCH_TOKEN is not set`, the
  variable is missing or the site has not redeployed since it was added.
  `GitHub refused to start ... 401` means the token expired or was revoked;
  `403` or `404` means it lacks Actions: Read and write on this repo.

Until the token is set, nothing changes: the functions log that and stop,
and the workflows run on GitHub's cron as before.
