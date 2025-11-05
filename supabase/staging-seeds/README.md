# Staging Seed Data

This directory contains sanitized production data used to seed the staging database.

## Files

After running the export script, you'll find:

- `members.json` - Clan members (full data, no PII)
- `events.json` - PvM boss events
- `users.json` - User accounts (sanitized passwords)
- `player_claims.json` - Player achievement claims
- `claim_requests.json` - Pending claim requests
- `user_goals.json` - User goals
- `races.json` - Competition races
- `race_participants.json` - Race participants

## Data Sanitization

The export script automatically sanitizes sensitive data:

### Users Table
- **Password hashes**: Replaced with generic hash `staging-password-123`
- **Emails**: Anonymized to `user-[id]@staging.local`

All users in staging can log in with password: `staging-password-123`

### Other Tables
- No sanitization needed (no PII present)

## Usage

### Export from Production
```bash
npm run staging:export
```

### Import to Staging
```bash
npm run staging:seed
```

### Refresh Staging (both steps)
```bash
npm run staging:refresh
```

## Git Ignored

These JSON files are ignored by git (contain production data).
Never commit these files to the repository!

## Automated Refresh

The staging database is automatically refreshed every Sunday at 2 AM UTC via GitHub Actions.
See `.github/workflows/refresh-staging.yml` for details.

---

For more information, see [STAGING_SETUP.md](../../STAGING_SETUP.md)
