#!/bin/bash

# Refresh Staging Database Script
# Exports from production and imports to staging in one command

set -e  # Exit on error

# Validate required CLI tools are installed
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ Error: '$1' is not installed or not in PATH"
    echo "   Please install and ensure it's available before running this script"
    echo ""
    if [ "$1" = "node" ]; then
      echo "   Install with: brew install node"
    fi
    exit 1
  fi
}

# Check for required tools
check_command "node"

echo "=========================================="
echo "Staging Database Refresh"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Create .env with production credentials first"
    exit 1
fi

# Step 1: Export from production
echo "📤 Step 1: Exporting production data..."
echo ""
node scripts/staging/export-production-data.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Export failed. Aborting."
    exit 1
fi

# Step 2: Check for staging credentials
echo ""
echo "=========================================="
echo ""

if [ -f .env.staging ]; then
    echo "📥 Step 2: Importing to staging (using .env.staging)..."
    echo ""

    # Temporarily use staging env
    mv .env .env.backup.temp
    cp .env.staging .env

    node scripts/staging/seed-staging-database.js
    SEED_EXIT_CODE=$?

    # Restore production env
    mv .env.backup.temp .env

    if [ $SEED_EXIT_CODE -ne 0 ]; then
        echo ""
        echo "❌ Seed failed."
        exit 1
    fi
else
    echo "⚠️  .env.staging not found"
    echo ""
    echo "Please set staging credentials:"
    echo ""
    read -p "STAGING_SUPABASE_URL: " STAGING_URL
    read -p "STAGING_SUPABASE_SERVICE_ROLE_KEY: " STAGING_KEY
    echo ""

    export STAGING_SUPABASE_URL="$STAGING_URL"
    export STAGING_SUPABASE_SERVICE_ROLE_KEY="$STAGING_KEY"

    node scripts/staging/seed-staging-database.js

    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Seed failed."
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "✅ Refresh Complete!"
echo "=========================================="
echo ""
echo "Staging database is now up to date with production data."
echo ""
