# Local Development Setup Guide
**For Fresh Computer Setup After Factory Reset**

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Get Your Supabase Credentials

Go to your Supabase dashboard: https://app.supabase.com/project/xshjeogimlzltdjpeejp

1. Click **Settings** (gear icon, left sidebar)
2. Click **API**
3. Copy these values:
   - **Project URL** (e.g., `https://xshjeogimlzltdjpeejp.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) ⚠️ Keep secret!

### Step 3: Create .env File

Create a file named `.env` in the project root:

```bash
# Copy this template and fill in your values
SUPABASE_URL=https://xshjeogimlzltdjpeejp.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional - WiseOldMan API
WOM_GROUP_ID=2928
WOM_API_KEY=

# Optional - Discord Webhooks (for notifications)
DISCORD_WEBHOOK_URL=
DISCORD_ANNIVERSARY_WEBHOOK_URL=

# Development mode (skips Discord messages locally)
NODE_ENV=development
```

### Step 4: Run the App

**Option A: Frontend Only (Fastest)**
```bash
npm start
```
Opens at http://localhost:3000

**Option B: With Functions (Full Stack)**
```bash
npm run netlify:dev
```
Opens at http://localhost:8888

---

## What You Need to Install

### Required (You Already Have These)
- ✅ Node.js 18+ (you have v24.10.0)
- ✅ npm (comes with Node)
- ✅ Git

### Optional Tools

#### Netlify CLI (For Local Functions)
**Only needed if:** You want to test Netlify functions/edge functions locally

Install:
```bash
npm install -g netlify-cli
```

Verify:
```bash
netlify --version
```

#### Supabase CLI (For Database Migrations)
**Only needed if:** You want to apply database migrations or work with local Supabase

Install:
```bash
brew install supabase/tap/supabase
```

Verify:
```bash
supabase --version
```

---

## Environment Variables Explained

### Required (Must Have)
| Variable | Where to Get It | Used For |
|----------|----------------|----------|
| `SUPABASE_URL` | Supabase Dashboard > Settings > API | Database connection |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | Frontend auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API | Backend admin operations |

### Optional (Can Leave Empty Locally)
| Variable | Where to Get It | Used For |
|----------|----------------|----------|
| `WOM_GROUP_ID` | Default: 2928 | WiseOldMan clan group ID |
| `WOM_API_KEY` | WiseOldMan API dashboard | Higher rate limits |
| `DISCORD_WEBHOOK_URL` | Discord Server Settings | Notifications |
| `NODE_ENV` | Set to "development" | Prevents sending real Discord messages |

---

## Available Commands

### Development
```bash
npm start              # Start React dev server (port 3000)
npm run netlify:dev    # Start with functions (port 8888)
```

### Testing
```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Building
```bash
npm run build         # Build for production
npm run preview       # Preview production build
```

### Deployment (You Don't Need This Locally)
```bash
npm run netlify:build  # Build for Netlify
npm run netlify:deploy # Deploy to Netlify
```

---

## Ports Used

When running locally, these ports will be used:

| Port | Service | URL |
|------|---------|-----|
| 3000 | React Dev Server | http://localhost:3000 |
| 8888 | Netlify Dev (main) | http://localhost:8888 |
| 3001 | Netlify Functions | http://localhost:3001 |

---

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
Kill the process using that port:
```bash
lsof -ti:3000 | xargs kill -9
```

### Environment variables not loading
- Make sure `.env` is in the **project root** (not in a subdirectory)
- Restart your dev server after changing `.env`
- Check that variable names match exactly (case-sensitive)

### Netlify CLI not found
```bash
# Install globally
npm install -g netlify-cli

# Or use npx (no install needed)
npx netlify dev
```

### Supabase connection issues
- Verify your `SUPABASE_URL` includes `https://`
- Check that your API keys haven't expired
- Confirm you're using the correct project URL

---

## What's .gitignore'd (Won't Be Committed)

These files/folders are automatically ignored:
- `node_modules/` - Dependencies (recreated with npm install)
- `.env` - Your secrets (NEVER commit this!)
- `build/` - Production build output
- `.netlify/` - Netlify CLI cache
- `coverage/` - Test coverage reports

---

## Next Steps After Setup

1. **Test the app runs:**
   ```bash
   npm start
   ```
   Visit http://localhost:3000

2. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for red errors in Console tab
   - Common issue: Missing Supabase credentials

3. **Test basic functionality:**
   - View members page
   - View events page
   - Check that data loads

4. **If everything works:**
   - You're ready to develop! 🎉
   - Changes auto-reload in browser
   - Edit files in `src/` directory

---

## Don't Have Your Supabase Credentials?

If you can't access your Supabase dashboard:

1. Go to https://app.supabase.com
2. Log in with your account
3. Click on your project (siege-clan-tracker)
4. If you don't see the project, you may need to be re-invited

Can't log in? You may need to reset your password or contact whoever set up the project.

---

## Quick Setup Commands (Copy/Paste)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (edit with your values)
cat > .env << 'EOF'
SUPABASE_URL=https://xshjeogimlzltdjpeejp.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here
WOM_GROUP_ID=2928
NODE_ENV=development
EOF

# 3. Start development
npm start

# 4. Open browser
open http://localhost:3000
```

---

That's it! You should be up and running in under 5 minutes. 🚀
