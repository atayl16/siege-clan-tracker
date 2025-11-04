# Staging Database Setup Guide

This guide will help you create a staging Supabase database with real production data for safe testing.

## Why Staging?

- ✅ Test database migrations safely
- ✅ Test admin operations without risk
- ✅ Netlify preview deployments use staging
- ✅ Seed with real production data
- ✅ No risk to active users

---

## Step 1: Create New Supabase Project (Staging)

### 1.1 Create the Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - **Name:** `siege-clan-tracker-staging`
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Same as production (for consistency)
   - **Pricing Plan:** Free tier is fine

4. Wait for project to be created (~2 minutes)

### 1.2 Get Staging Credentials

Once created, go to **Settings > API**:

```bash
# Save these for later
STAGING_SUPABASE_URL=https://[your-staging-ref].supabase.co
STAGING_SUPABASE_ANON_KEY=eyJ...
STAGING_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Step 2: Export Production Data

### 2.1 Link to Production Project

```bash
# If not already linked
supabase link --project-ref xshjeogimlzltdjpeejp
```

### 2.2 Export Production Schema

```bash
# Export full schema (structure + RLS policies)
supabase db dump --schema-only -f supabase/production-schema.sql

# Or export everything (schema + data - can be large!)
supabase db dump -f supabase/production-full-backup-$(date +%Y%m%d).sql
```

### 2.3 Export Production Data (Sanitized)

I'll create scripts to export and sanitize production data:

```bash
# Run the export script (creates sanitized data files)
node scripts/staging/export-production-data.js
```

This will create:
- `supabase/staging-seeds/members.json`
- `supabase/staging-seeds/events.json`
- `supabase/staging-seeds/users.json` (passwords hashed, emails anonymized)
- `supabase/staging-seeds/other-tables.json`

---

## Step 3: Set Up Staging Database

### 3.1 Link to Staging Project

```bash
# Unlink from production
supabase unlink

# Link to staging
supabase link --project-ref YOUR-STAGING-PROJECT-REF
```

### 3.2 Apply Migrations to Staging

```bash
# Apply all migrations (creates tables, RLS, RPC functions)
supabase db push
```

### 3.3 Seed Staging Database

```bash
# Import the production data into staging
node scripts/staging/seed-staging-database.js
```

---

## Step 4: Configure Netlify for Staging

### 4.1 Add Staging Environment Variables

In Netlify dashboard:

1. Go to **Site settings > Environment variables**
2. Click **"Add a variable"**
3. Add these for **Deploy Preview** context only:

```bash
# Deploy Preview Environment Variables
SUPABASE_URL=https://[your-staging-ref].supabase.co
SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-key]

# Keep production values for Production deploys
```

### 4.2 Configure Environment Scopes

Netlify supports different values per context:

- **Production:** Uses production Supabase
- **Deploy Previews:** Uses staging Supabase
- **Branch Deploys:** Uses staging Supabase

To set this up:

1. In Netlify dashboard, for each variable:
2. Click the variable name
3. Set **"Scopes"**:
   - Production: `https://xshjeogimlzltdjpeejp.supabase.co`
   - Deploy previews: `https://[staging-ref].supabase.co`
   - Branch deploys: `https://[staging-ref].supabase.co`

---

## Step 5: Local Development with Staging

### 5.1 Create .env.staging File

```bash
# Create staging environment file
cp .env.example .env.staging
```

Edit `.env.staging`:

```bash
# Staging Database
SUPABASE_URL=https://[your-staging-ref].supabase.co
SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-key]

# Same as production
WOM_GROUP_ID=2928
WOM_API_KEY=
NODE_ENV=development
```

### 5.2 Use Staging Locally

```bash
# Use staging environment
npm run dev:staging

# Or manually
cp .env.staging .env
npm start
```

---

## Step 6: Keeping Staging Fresh

### Refresh Staging Data

Create a cron job or run manually to refresh staging with production data:

```bash
# 1. Export from production
supabase link --project-ref xshjeogimlzltdjpeejp
node scripts/staging/export-production-data.js

# 2. Import to staging
supabase link --project-ref YOUR-STAGING-PROJECT-REF
node scripts/staging/seed-staging-database.js
```

### Automated Refresh (GitHub Actions)

Create a workflow to refresh staging weekly:

```yaml
# .github/workflows/refresh-staging.yml
name: Refresh Staging Database

on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  refresh-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Export production data
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node scripts/staging/export-production-data.js

      - name: Seed staging database
        env:
          STAGING_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          STAGING_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY }}
        run: node scripts/staging/seed-staging-database.js
```

---

## Data Sanitization

### What Gets Sanitized

The export script will sanitize sensitive data:

**Users table:**
- ✅ Keep: username, is_admin, created_at
- ⚠️ Sanitize: password_hash (replace with generic hash)
- ⚠️ Sanitize: email (if you add it later)

**Members table:**
- ✅ Keep: All data (no PII)

**Claim requests:**
- ✅ Keep: All data (messages are game-related)

**Events:**
- ✅ Keep: All data (public info)

### Why Sanitize?

- Staging database might be shared with testers
- Prevents accidental password leaks
- Complies with data protection best practices
- Reduces liability

---

## Testing Workflow

### Before Making Changes

1. Create feature branch
2. Make changes locally with staging DB
3. Push to GitHub
4. Netlify creates preview deployment (uses staging DB)
5. Test on preview URL
6. If good, merge to main
7. Production deployment (uses production DB)

### For Database Migrations

1. Test migration on staging first:
   ```bash
   supabase link --project-ref STAGING-REF
   supabase db push
   # Test thoroughly
   ```

2. If successful, apply to production:
   ```bash
   supabase link --project-ref xshjeogimlzltdjpeejp
   supabase db push
   ```

---

## Troubleshooting

### "Too much data to export"

If production data is very large:

```bash
# Export only recent data
node scripts/staging/export-production-data.js --limit 1000

# Or export specific tables only
node scripts/staging/export-production-data.js --tables members,events,users
```

### "Staging out of sync with production"

Run the refresh script:

```bash
./scripts/staging/refresh-staging.sh
```

### "Can't remember which DB I'm linked to"

```bash
# Check current link
cat supabase/.temp/project-ref

# Production ref: xshjeogimlzltdjpeejp
# Staging ref: [your-staging-ref]
```

---

## Cost Considerations

### Free Tier Limits (Per Project)

- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 2 GB/month
- API Requests: 50K/month

**Both projects on free tier = Still free!**

If staging exceeds limits:
- Reduce seed data size
- Clean up old test data periodically
- Use production data sampling

---

## Best Practices

1. **Never test destructive operations on production**
   - Always test deletions on staging first
   - Test bulk updates on staging
   - Verify RLS policies on staging

2. **Keep staging data fresh**
   - Refresh weekly or after major production changes
   - Update seed data when schema changes

3. **Use staging for all PRs**
   - Netlify previews automatically use staging
   - Reviewers can test without affecting production

4. **Document staging differences**
   - Note if staging has less data than production
   - Document any test-specific configurations

5. **Regular cleanup**
   - Delete test data created during testing
   - Keep staging database size manageable

---

## Quick Reference

```bash
# Link to production
supabase link --project-ref xshjeogimlzltdjpeejp

# Link to staging
supabase link --project-ref YOUR-STAGING-REF

# Export production data
node scripts/staging/export-production-data.js

# Seed staging
node scripts/staging/seed-staging-database.js

# Refresh staging (one command)
./scripts/staging/refresh-staging.sh

# Check which project you're linked to
cat supabase/.temp/project-ref
```

---

## Next Steps

1. ✅ Create staging Supabase project
2. ✅ Get staging credentials
3. ✅ Run export scripts (I'll create these next)
4. ✅ Seed staging database
5. ✅ Configure Netlify preview deployments
6. ✅ Test a PR with staging
7. ✅ Set up automated refresh (optional)

Ready to proceed? Let me know when you've created the staging project and I'll help you set up the export/seed scripts!
