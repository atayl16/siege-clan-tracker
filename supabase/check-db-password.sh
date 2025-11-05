#!/bin/bash

# Script to help you check if you have/remember your database password

echo "=========================================="
echo "Database Password Check"
echo "=========================================="
echo ""
echo "The database password is used ONLY for:"
echo "  - Supabase CLI"
echo "  - Direct PostgreSQL connections"
echo "  - Database management tools"
echo ""
echo "It is NOT used by your app in production!"
echo ""
echo "=========================================="
echo ""

# Method 1: Check Supabase Dashboard
echo "Method 1: Check Supabase Dashboard"
echo "-----------------------------------"
echo "1. Go to: https://app.supabase.com"
echo "2. Select your project"
echo "3. Go to: Settings > Database"
echo "4. Look for 'Database password' section"
echo "5. If it says 'Database password has been set', you have one"
echo ""
echo "Press Enter to continue..."
read

# Method 2: Try to connect
echo ""
echo "Method 2: Test Connection"
echo "-------------------------"
echo "If you think you know your password, we can test it now."
echo ""
read -p "Do you want to test a password? (y/n): " TEST_PASSWORD

if [ "$TEST_PASSWORD" = "y" ] || [ "$TEST_PASSWORD" = "Y" ]; then
    echo ""
    read -p "Enter your Supabase project reference ID: " PROJECT_REF
    echo ""
    echo "Attempting to connect..."
    echo "(This will prompt for your database password)"
    echo ""

    supabase link --project-ref "$PROJECT_REF" 2>&1 | head -10

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Success! Your password works."
    else
        echo ""
        echo "❌ Connection failed. You may need to reset your password."
    fi
fi

echo ""
echo "=========================================="
echo "Need to Reset Your Password?"
echo "=========================================="
echo ""
echo "If you don't remember it or need to reset:"
echo ""
echo "1. Go to: https://app.supabase.com"
echo "2. Select your project"
echo "3. Go to: Settings > Database"
echo "4. Find 'Database password' section"
echo "5. Click 'Reset database password'"
echo "6. Copy the new password (you'll need it for CLI)"
echo ""
echo "⚠️  IMPORTANT: Resetting will NOT break your app!"
echo "   Your app uses API keys, not the database password."
echo ""
echo "After resetting, you can use the new password for:"
echo "  - Running ./supabase/QUICK_SETUP.sh"
echo "  - Future CLI operations"
echo "  - Database tools"
echo ""
