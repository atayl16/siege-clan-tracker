#!/usr/bin/env node

/**
 * Seed Staging Database Script
 *
 * Imports sanitized production data into staging Supabase database.
 *
 * Usage:
 *   STAGING_SUPABASE_URL=... STAGING_SUPABASE_SERVICE_ROLE_KEY=... node scripts/staging/seed-staging-database.js
 *
 * Or create .env.staging with staging credentials and run:
 *   node scripts/staging/seed-staging-database.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

// Check for staging credentials (try multiple env var names)
const supabaseUrl =
  process.env.STAGING_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Staging Supabase credentials not found');
  console.error('');
  console.error('Set these environment variables:');
  console.error('  STAGING_SUPABASE_URL=https://your-staging-project.supabase.co');
  console.error('  STAGING_SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key');
  console.error('');
  console.error('Or create .env.staging file and run:');
  console.error('  cp .env.staging .env && node scripts/staging/seed-staging-database.js');
  process.exit(1);
}

console.log(`\n🔗 Connecting to: ${supabaseUrl}`);

// Confirm this is NOT production
if (supabaseUrl.includes('xshjeogimlzltdjpeejp')) {
  console.error('\n❌ DANGER: This appears to be production database!');
  console.error('   Refusing to seed production with test data.');
  console.error('   Please use staging database credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Input directory
const inputDir = path.join(__dirname, '../../supabase/staging-seeds');

// Check if seed files exist
if (!fs.existsSync(inputDir)) {
  console.error(`\n❌ Error: Seed directory not found: ${inputDir}`);
  console.error('   Run export script first: node scripts/staging/export-production-data.js');
  process.exit(1);
}

/**
 * Import data into a table
 */
async function importTable(tableName) {
  const filePath = path.join(inputDir, `${tableName}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  No seed file for ${tableName}, skipping`);
    return;
  }

  console.log(`\n📥 Importing ${tableName}...`);

  try {
    // Read seed data
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    if (!data || data.length === 0) {
      console.log(`   ℹ️  No data to import for ${tableName}`);
      return;
    }

    console.log(`   Found ${data.length} rows to import`);

    // Delete existing data first
    console.log(`   🗑️  Clearing existing ${tableName} data...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround for delete() requiring a filter)

    if (deleteError && !deleteError.message.includes('No rows found')) {
      console.error(`   ⚠️  Warning clearing ${tableName}:`, deleteError.message);
    }

    // Insert in batches (Supabase has limits)
    const batchSize = 500;
    let imported = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`   ❌ Error importing batch to ${tableName}:`, insertError.message);
        console.error(`   Failed at row ${i}`);
        // Continue with next batch instead of failing completely
        continue;
      }

      imported += batch.length;
      console.log(`   ✅ Imported ${imported}/${data.length} rows`);
    }

    console.log(`   ✅ Completed ${tableName}: ${imported} rows imported`);

  } catch (err) {
    console.error(`   ❌ Unexpected error importing ${tableName}:`, err.message);
  }
}

/**
 * Main seed function
 */
async function seedStagingDatabase() {
  console.log('==========================================');
  console.log('Staging Database Seed');
  console.log('==========================================');
  console.log(`\nTarget: ${supabaseUrl}`);
  console.log(`Source: ${inputDir}`);

  console.log('\n⚠️  WARNING: This will DELETE existing data in staging!');
  console.log('   Press Ctrl+C within 3 seconds to cancel...\n');

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🚀 Starting import...\n');

  // Import tables in order (respecting foreign key constraints)
  const importOrder = [
    'users',          // First (other tables reference this)
    'members',        // Independent
    'events',         // Independent
    'player_claims',  // References users and members
    'claim_requests', // References users and members
    'user_goals',     // References users
    'races',          // References users
    'race_participants', // References races
  ];

  for (const tableName of importOrder) {
    await importTable(tableName);
  }

  console.log('\n==========================================');
  console.log('✅ Seed Complete!');
  console.log('==========================================');
  console.log('\nYour staging database now has production data.');
  console.log('You can now test safely without affecting production!\n');
}

// Run seed
seedStagingDatabase().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
