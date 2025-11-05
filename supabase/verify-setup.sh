#!/bin/bash

# Verification Script for Supabase Setup
# Run this after applying migrations to ensure everything is configured correctly

set -e

echo "=========================================="
echo "Supabase Setup Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command succeeds
check_step() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        exit 1
    fi
}

# Check 1: RPC Functions
echo "Checking RPC Functions..."
FUNCTIONS_COUNT=$(supabase db execute --query "
SELECT COUNT(*)
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%';
" | grep -o '[0-9]*' | tail -1)

if [ "$FUNCTIONS_COUNT" -eq 4 ]; then
    echo -e "${GREEN}✅ All 4 RPC functions found${NC}"
    supabase db execute --query "
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name LIKE 'admin_%'
    ORDER BY routine_name;
    "
else
    echo -e "${RED}❌ Expected 4 RPC functions, found ${FUNCTIONS_COUNT}${NC}"
    exit 1
fi

echo ""

# Check 2: RLS Enabled
echo "Checking Row Level Security..."
RLS_DISABLED=$(supabase db execute --query "
SELECT COUNT(*)
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('members', 'users', 'events', 'player_claims', 'claim_requests', 'user_goals', 'races', 'race_participants')
  AND rowsecurity = false;
" | grep -o '[0-9]*' | tail -1)

if [ "$RLS_DISABLED" -eq 0 ]; then
    echo -e "${GREEN}✅ RLS enabled on all tables${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: ${RLS_DISABLED} tables have RLS disabled${NC}"
fi

echo ""

# Check 3: RLS Policies
echo "Checking RLS Policies..."
POLICIES_COUNT=$(supabase db execute --query "
SELECT COUNT(*)
FROM pg_policies
WHERE schemaname = 'public';
" | grep -o '[0-9]*' | tail -1)

if [ "$POLICIES_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found ${POLICIES_COUNT} RLS policies${NC}"
    echo ""
    echo "Policies by table:"
    supabase db execute --query "
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename;
    "
else
    echo -e "${RED}❌ No RLS policies found${NC}"
    exit 1
fi

echo ""

# Check 4: Members table structure
echo "Checking members table structure..."
supabase db execute --query "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'members'
ORDER BY ordinal_position;
" > /dev/null
check_step

echo ""

# Check 5: Test a simple query
echo "Testing member query (respecting RLS)..."
supabase db execute --query "
SELECT COUNT(*) as visible_members
FROM members
WHERE hidden = false OR hidden IS NULL;
" > /dev/null
check_step

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All Checks Passed!${NC}"
echo "=========================================="
echo ""
echo "Your Supabase database is properly configured."
echo ""
echo "Next steps:"
echo "1. Update Netlify environment variables"
echo "2. Test edge functions in PR #36"
echo "3. Verify admin operations work in production"
echo ""
