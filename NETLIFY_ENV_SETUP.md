# Netlify Environment Variables Setup

## Required Environment Variables

Add these to your Netlify site settings:

### 1. Go to Netlify Dashboard
https://app.netlify.com/sites/siege-clan-tracker/settings/deploys#environment

### 2. Add These Variables

**For Staging Database:**
```
VITE_SUPABASE_URL=https://rbcssjjhbsgfmilpazux.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3NzampoYnNnZm1pbHBhenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODcyMTAsImV4cCI6MjA3Nzg2MzIxMH0.w8XSbis-qScI1PSU7HS6fHzCkFE52beW2JCc3HaF0Vc
```

**Also Keep These (for server-side code):**
```
SUPABASE_URL=https://rbcssjjhbsgfmilpazux.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3NzampoYnNnZm1pbHBhenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODcyMTAsImV4cCI6MjA3Nzg2MzIxMH0.w8XSbis-qScI1PSU7HS6fHzCkFE52beW2JCc3HaF0Vc
SUPABASE_SERVICE_ROLE_KEY=(get from Supabase dashboard)
```

### 3. Trigger Redeploy

After adding the variables:
1. Go to: https://app.netlify.com/sites/siege-clan-tracker/deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"

## Why This Is Needed

**Vite Environment Variable Requirements:**
- Vite only exposes environment variables with `VITE_` prefix to browser code
- Variables without prefix are only available in server-side code (Netlify Functions)
- The Supabase client runs in the browser, so it needs `VITE_` prefixed variables

**What was broken:**
- Browser code was trying to use `process.env.SUPABASE_URL`
- Vite doesn't expose this to the browser (returns `undefined`)
- Supabase client initialized with `undefined` URL and key
- All API requests failed with 401 Unauthorized

**What's fixed:**
- Code now checks `import.meta.env.VITE_SUPABASE_URL` first
- Falls back to `process.env.SUPABASE_URL` for Node.js contexts
- With proper Netlify env vars, browser will have access to Supabase config

## Verification

After deploying, check the browser console. You should see:
```
✓ Using Supabase URL: ✓ Set
✓ Using Anon Key ending with: ...F0Vc
```

If you see "❌ Missing" instead, the env vars aren't set correctly.
