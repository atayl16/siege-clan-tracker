#!/usr/bin/env node

/**
 * Export Production Data Script
 *
 * Exports data from production Supabase and sanitizes sensitive information
 * for use in staging environment.
 *
 * Usage:
 *   node scripts/staging/export-production-data.js
 *   node scripts/staging/export-production-data.js --limit 1000
 *   node scripts/staging/export-production-data.js --tables members,events
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit'));
const tablesArg = args.find(arg => arg.startsWith('--tables'));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const tablesToExport = tablesArg
  ? tablesArg.split('=')[1].split(',')
  : ['members', 'events', 'users', 'player_claims', 'claim_requests', 'user_goals', 'races', 'race_participants'];

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Make sure your .env file has production credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Output directory
const outputDir = path.join(__dirname, '../../supabase/staging-seeds');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Sanitize user data
 */
function sanitizeUsers(users) {
  const genericPasswordHash = crypto.createHash('sha256').update('staging-password-123').digest('hex');

  return users.map(user => ({
    ...user,
    // Replace password hash with generic one
    password_hash: genericPasswordHash,
    // If email exists, anonymize it
    email: user.email ? `user-${user.id.slice(0, 8)}@staging.local` : null,
  }));
}

/**
 * Sanitize claim requests (if they have any sensitive notes)
 */
function sanitizeClaimRequests(requests) {
  return requests.map(request => ({
    ...request,
    // Keep messages as they're game-related
    // If you want to sanitize admin_notes:
    // admin_notes: request.admin_notes ? '[REDACTED]' : null
  }));
}

/**
 * Export a table
 */
async function exportTable(tableName, sanitizeFn = null) {
  console.log(`\n📦 Exporting ${tableName}...`);

  try {
    let query = supabase.from(tableName).select('*');

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Order by created_at if it exists (get most recent data)
    // Try to order, but don't fail if column doesn't exist
    try {
      query = query.order('created_at', { ascending: false });
    } catch (e) {
      // Column doesn't exist, skip ordering
    }

    const { data, error } = await query;

    if (error) {
      console.error(`   ❌ Error exporting ${tableName}:`, error.message);
      return;
    }

    // Apply sanitization function if provided
    const sanitizedData = sanitizeFn ? sanitizeFn(data) : data;

    // Write to file
    const outputPath = path.join(outputDir, `${tableName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(sanitizedData, null, 2));

    console.log(`   ✅ Exported ${sanitizedData.length} rows to ${tableName}.json`);

  } catch (err) {
    console.error(`   ❌ Unexpected error exporting ${tableName}:`, err.message);
  }
}

/**
 * Main export function
 */
async function exportAllData() {
  console.log('==========================================');
  console.log('Production Data Export');
  console.log('==========================================');
  console.log(`\nExporting to: ${outputDir}`);

  if (limit) {
    console.log(`Limit: ${limit} rows per table`);
  }

  if (tablesToExport.length < 8) {
    console.log(`Tables: ${tablesToExport.join(', ')}`);
  }

  console.log('\n⚠️  Note: Sensitive data will be sanitized');
  console.log('   - User passwords will be replaced with generic hash');
  console.log('   - User emails will be anonymized\n');

  // Export each table with appropriate sanitization
  const tableConfig = {
    members: { sanitize: null },
    events: { sanitize: null },
    users: { sanitize: sanitizeUsers },
    player_claims: { sanitize: null },
    claim_requests: { sanitize: sanitizeClaimRequests },
    user_goals: { sanitize: null },
    races: { sanitize: null },
    race_participants: { sanitize: null },
  };

  for (const tableName of tablesToExport) {
    if (tableConfig[tableName]) {
      await exportTable(tableName, tableConfig[tableName].sanitize);
    } else {
      console.log(`   ⚠️  Unknown table: ${tableName}, skipping`);
    }
  }

  console.log('\n==========================================');
  console.log('✅ Export Complete!');
  console.log('==========================================');
  console.log(`\nExported files are in: ${outputDir}`);
  console.log('\nNext steps:');
  console.log('1. Review the exported JSON files');
  console.log('2. Run: node scripts/staging/seed-staging-database.js');
  console.log('');
}

// Run export
exportAllData().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
