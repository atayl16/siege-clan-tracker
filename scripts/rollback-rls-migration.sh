#!/bin/bash
# Rollback RLS Migration (20250104000003)
# Use this if you need to undo the RLS policies migration

set -e

# Validate required CLI tools are installed
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ Error: '$1' is not installed or not in PATH"
    echo "   Please install and ensure it's available before running this script"
    echo ""
    if [ "$1" = "supabase" ]; then
      echo "   Install with: brew install supabase/tap/supabase"
    elif [ "$1" = "psql" ]; then
      echo "   Install with: brew install postgresql"
    fi
    exit 1
  fi
}

# Check for required tools
check_command "supabase"
check_command "psql"

echo "⚠️  RLS Migration Rollback Script"
echo "=================================="
echo ""
echo "This will:"
echo "  1. Remove all RLS policies"
echo "  2. Disable RLS on all tables"
echo "  3. Mark migration as reverted"
echo ""
echo "⚠️  WARNING: This removes security policies!"
echo ""

# Ask which database
echo "Which database do you want to rollback?"
echo "  1) Staging (rbcssjjhbsgfmilpazux)"
echo "  2) Production (xshjeogimlzltdjpeejp)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
  PROJECT_REF="rbcssjjhbsgfmilpazux"
  DB_NAME="STAGING"
elif [ "$choice" = "2" ]; then
  PROJECT_REF="xshjeogimlzltdjpeejp"
  DB_NAME="PRODUCTION"
  echo ""
  echo "⚠️⚠️⚠️  YOU ARE ABOUT TO ROLLBACK PRODUCTION  ⚠️⚠️⚠️"
  echo ""
  read -p "Type 'ROLLBACK PRODUCTION' to confirm: " confirm
  if [ "$confirm" != "ROLLBACK PRODUCTION" ]; then
    echo "❌ Cancelled."
    exit 1
  fi
else
  echo "❌ Invalid choice."
  exit 1
fi

echo ""
echo "Linking to $DB_NAME database..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "Running rollback SQL..."
psql "$(supabase db url --linked)" -f supabase/migrations/ROLLBACK_20250104000003_rls_policies.sql

echo ""
echo "Marking migration as reverted in history..."
supabase migration repair 20250104000003 --status reverted --linked

echo ""
echo "✅ Rollback complete!"
echo ""
echo "To verify:"
echo "  supabase migration list --linked"
