Tasks
=====

Context
-------
- Deployment: Netlify (static frontend + serverless functions) and Supabase backend.
- Constraints: Solo maintainer, free-tier tooling only, ~200 users, manual staging QA.
- Goal: Production-grade reliability signals and interview-ready talking points without recurring cost.

How to Use
----------
- Work through tasks in order (or pick what fits the week). Each item lists key steps and an AI helper prompt you can paste into Cursor/ChatGPT.
- Keep notes, checkmarks, or dates inline—this file is ignored by git, so it’s purely for you.

Task 1 — Add Sentry Monitoring (Frontend + Netlify Functions)
-------------------------------------------------------------
Why: Capture runtime errors and performance traces. Sentry’s free tier is generous enough for this project.

Implementation Notes:
1. Create a Sentry account/project (JavaScript + React).
2. Install SDK: `npm install @sentry/react @sentry/tracing`.
3. Initialize Sentry in `src/main.jsx` (or the top-level entry) with a modest `tracesSampleRate` (e.g., 0.2).
4. For Netlify functions, install `@sentry/node`, wrap handlers, and read DSN from `process.env.SENTRY_DSN` (add to Netlify env vars for staging/prod).
5. Add release tagging (set `SENTRY_RELEASE` using the git SHA—see Task 2).
6. Document setup & silencing instructions in `docs/ops-playbook.md`.

AI Prompt:

```
You are working in /Users/alishataylor/siege-clan-tracker. Add Sentry monitoring to the Vite React frontend and all Netlify serverless/edge functions. Use @sentry/react for the client entry point (src/main.jsx) with a conservative tracesSampleRate and enable session replay only on errors. For Netlify functions, instrument with @sentry/node (or the edge equivalent) loading DSN from process.env.SENTRY_DSN. Share configuration helpers if useful, avoid hardcoding secrets, and update README.md with setup instructions and environment variables.
```

Task 2 — Surface Build Metadata (`/healthz` + Release Tags)
----------------------------------------------------------
Why: Simplifies uptime checks and connects errors/alerts to a specific deploy.

Implementation Notes:
1. Create `netlify/functions/healthz.js` returning JSON `{ status: 'ok', timestamp, sha }`.
2. Expose git SHA to the frontend via `import.meta.env.VITE_GIT_SHA` (populate using Netlify’s `COMMIT_REF` during builds).
3. Add a build helper (npm script or small node file) to set `VITE_GIT_SHA` locally (`git rev-parse HEAD`).
4. Document the endpoint and hook it up to Better Stack as a heartbeat monitor.

AI Prompt:

```
In /Users/alishataylor/siege-clan-tracker, add a Netlify function /.netlify/functions/healthz that returns JSON with ok status, ISO timestamp, and the current git SHA. Ensure Vite exposes the SHA via import.meta.env.VITE_GIT_SHA, using Netlify's COMMIT_REF when available and falling back to git rev-parse during local builds. Update documentation to describe the endpoint and how monitors should use it.
```

Task 3 — Dependabot for npm and GitHub Actions
---------------------------------------------
Why: Keep dependencies and workflows current automatically, minimal manual effort.

Implementation Notes:
1. Add `.github/dependabot.yml` with weekly updates for `npm` and `github-actions`.
2. Limit concurrent PRs (e.g., `open-pull-requests-limit: 5`) and label them (`chore/deps`).
3. Note the automation in the ops playbook for interview talking points.

AI Prompt:

```
Set up Dependabot in /Users/alishataylor/siege-clan-tracker. Create .github/dependabot.yml that checks npm dependencies and GitHub Actions weekly, caps open PRs at 5, labels each PR chore/deps, and assigns them to @atayl16. Add a short blurb to docs/ops-playbook.md stating that automated dependency updates are enabled.
```

Task 4 — CI Coverage & Lint Visibility
--------------------------------------
Why: Showcase testing discipline and ensure lint rules run consistently.

Implementation Notes:
1. Update `.github/workflows/ci.yml` to run `npm run lint` and `npm run test -- --coverage`.
2. Upload `coverage/coverage-summary.json` as an artifact and print summary stats in job output.
3. Add a “CI & Coverage” blurb/badge in `README.md` referencing the workflow results.

AI Prompt:

```
Modify .github/workflows/ci.yml in /Users/alishataylor/siege-clan-tracker to add lint and coverage steps. After running vitest with coverage enabled, upload coverage-summary.json as an artifact and append a coverage summary to the workflow summary output. Update README.md with a small section explaining how CI verifies lint/tests/coverage and link to the workflow run page.
```

Task 5 — Scheduled Security & Dependency Audit
----------------------------------------------
Why: Catch vulnerabilities or drift even when no code changes land that week.

Implementation Notes:
1. Create `.github/workflows/security-audit.yml` running weekly + manual dispatch.
2. Steps: checkout, `npm ci`, `npm audit --omit=dev`. Use `continue-on-error: true` so the job reports findings without failing.
3. Optionally add `npx syncpack list-mismatches` for semver hygiene.
4. Document remediation flow in the ops playbook.

AI Prompt:

```
Create a GitHub Actions workflow at .github/workflows/security-audit.yml in /Users/alishataylor/siege-clan-tracker. It should run on a weekly schedule and workflow_dispatch, install dependencies with npm ci, run npm audit --omit=dev, allow the audit step to fail without stopping the workflow, and surface the report in the job summary. Mention the new workflow in docs/ops-playbook.md with instructions for triaging findings.
```

Task 6 — Optional Privacy-Friendly Analytics
--------------------------------------------
Why: Gain usage insights without violating privacy or paying for tooling.

Implementation Notes:
1. Use Cloudflare Web Analytics (free script-based) or Umami’s free hosted plan.
2. Add a feature flag (`VITE_ENABLE_ANALYTICS`) so analytics only run when configured.
3. Update privacy docs explaining what’s collected and how to opt out.

AI Prompt:

```
Add optional Cloudflare Web Analytics support to /Users/alishataylor/siege-clan-tracker. Load the analytics script only when import.meta.env.VITE_ENABLE_ANALYTICS and import.meta.env.VITE_CF_ANALYTICS_TOKEN are set. Provide a small helper to inject the script and update README.md with a privacy note on how to enable/disable analytics in Netlify environment settings.
```

Task 7 — Ops Playbook Documentation
-----------------------------------
Why: Capture institutional knowledge for future you and impress interviewers.

Implementation Notes:
1. Create `docs/ops-playbook.md` covering deploy flow, env vars, Sentry/Beter Stack procedures, backups, and member reinstatement steps.
2. Link the playbook from `README.md`.
3. Include incident response ideas (e.g., how to throttle Sentry alerts).

AI Prompt:

```
Draft docs/ops-playbook.md in /Users/alishataylor/siege-clan-tracker. Document deployment steps (Netlify, Supabase), required environment variables, Sentry alert handling, Better Stack monitor setup, backup/restore instructions, and the process for reinstating a member by clearing left_date. Add a link to this playbook from README.md.
```

Task 8 — Better Stack Heartbeat & Alert Tuning
----------------------------------------------
Why: Ensure the uptime monitor hits `/healthz` and alerts reach a channel you actually watch.

Implementation Notes:
1. Register `/healthz` (from Task 2) as a Better Stack heartbeat.
2. Configure quiet hours / escalation policy—route to email filter or Discord webhook.
3. Document alert routing and expected response payload in the ops playbook.

AI Prompt:

```
After the /healthz endpoint exists, update docs/ops-playbook.md in /Users/alishataylor/siege-clan-tracker with instructions for adding it as a Better Stack heartbeat, setting quiet hours, and routing notifications to a Discord webhook. Include the expected JSON response so future debugging is quick.
```

Task 9 — Feature Flag Helper
----------------------------
Why: Toggle sensitive features (analytics, sampling tweaks) without touching multiple files.

Implementation Notes:
1. Create `src/config/featureFlags.js` exporting `isEnabled(flag)` reading `import.meta.env.VITE_FLAG_<NAME>`.
2. Use the helper anywhere environment toggles exist (e.g., analytics feature).
3. Document naming conventions in the ops playbook.

AI Prompt:

```
Introduce a lightweight feature flag helper in /Users/alishataylor/siege-clan-tracker. Create src/config/featureFlags.js with an isEnabled(flag) utility that reads import.meta.env.VITE_FLAG_<FLAG>. Refactor any new analytics/Sentry toggles to use the helper and document usage in README.md or docs/ops-playbook.md.
```

Task 10 — Scripted Supabase Backups
-----------------------------------
Why: Have a restore path even without paid backup tooling.

Implementation Notes:
1. Write `scripts/backups/export-supabase.js` that authenticates via environment variables and exports key tables (SQL or JSON) into `supabase/backup-YYYY-MM-DD.sql` (already ignored).
2. Add `.github/workflows/manual-backup.yml` with `workflow_dispatch` to run the script and upload the artifact.
3. Document backup cadence and restore steps in the ops playbook.

AI Prompt:

```
Implement a backup helper in /Users/alishataylor/siege-clan-tracker. Add scripts/backups/export-supabase.js that uses service role credentials to export core tables to supabase/backup-<date>.sql or .json, and create .github/workflows/manual-backup.yml that runs on workflow_dispatch, executes the script, and uploads the generated file as an artifact. Update docs/ops-playbook.md with instructions for running the backup and restoring data.
```

Next Steps
----------
- Pick the next task that provides the most value or best “interview story.”
- After completing each, update relevant docs and give staging a quick smoke test.
- Keep this list updated for future planning; add ⭐ items you want to highlight in conversations.

