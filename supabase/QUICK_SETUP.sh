#!/bin/bash

# Quick Setup Script for Supabase Migrations
# This script will help you set up your Supabase database from the command line

set -e  # Exit on any error

echo "=========================================="
echo "Supabase Migration Setup Script"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Installing now via Homebrew..."

    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed."
        echo "Please install Homebrew first: https://brew.sh"
        echo "Or install Supabase CLI manually: https://github.com/supabase/cli#install-the-cli"
        exit 1
    fi

    brew install supabase/tap/supabase
fi

echo "✅ Supabase CLI is installed"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please log in to Supabase..."
    supabase login
fi

echo "✅ Logged in to Supabase"
echo ""

# Check if project is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "🔗 Project not linked yet."
    echo "Please enter your Supabase project reference ID:"
    echo "(Find it in your Supabase dashboard URL or Settings > General > Reference ID)"
    read -p "Project Ref: " PROJECT_REF

    echo "Linking project..."
    supabase link --project-ref "$PROJECT_REF"
else
    echo "✅ Project is already linked"
fi

echo ""
echo "=========================================="
echo "Applying Migrations..."
echo "=========================================="
echo ""

# Apply migrations
echo "📦 Applying RPC functions migration..."
supabase db push --include-all

echo ""
echo "✅ Migrations applied successfully!"
echo ""

# Verify setup
echo "=========================================="
echo "Verifying Setup..."
echo "=========================================="
echo ""

echo "📋 Checking RPC functions..."
supabase db execute --query "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%'
ORDER BY routine_name;
"

echo ""
echo "📋 Checking RLS status..."
supabase db execute --query "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('members', 'users', 'events')
ORDER BY tablename;
"

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check the output above to ensure all functions were created"
echo "2. Update your Netlify environment variables:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - SUPABASE_ANON_KEY"
echo "3. Test the edge functions in PR #36"
echo ""
echo "For detailed verification steps, see supabase/SETUP_GUIDE.md"
echo ""
