#!/bin/bash

# Temporarily use staging environment variables for local development

# Backup current .env
cp .env .env.backup

# Create new .env with staging credentials
cat > .env << 'EOF'
# Supabase Configuration (STAGING)
SUPABASE_URL=${STAGING_SUPABASE_URL:-https://rbcssjjhbsgfmilpazux.supabase.co}
SUPABASE_ANON_KEY=${STAGING_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${STAGING_SUPABASE_SERVICE_ROLE_KEY}

# WiseOldMan Configuration (OPTIONAL)
WOM_GROUP_ID=2928
WOM_API_KEY=

# Discord Webhooks (OPTIONAL - for notifications)
DISCORD_WEBHOOK_URL=
DISCORD_ANNIVERSARY_WEBHOOK_URL=

# Development Mode (OPTIONAL - prevents sending real Discord messages)
NODE_ENV=development

# Original credentials stored below
EOF

# Append original staging credentials from backup
grep "^STAGING_" .env.backup >> .env

echo "✅ Switched to staging environment"
echo "   Run: npm start"
echo "   To restore: mv .env.backup .env"
