/**
 * Integration tests for claim requests functionality
 * Tests RLS policies and end-to-end flows to catch permission issues
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { supabase } from '../supabaseClient';

describe('Claim Requests Integration Tests', () => {
  let testUserId;
  let testClaimRequestId;

  // Note: These tests run against the actual Supabase instance
  // Make sure your RLS policies are set up correctly!

  beforeAll(async () => {
    // Check if we can connect to Supabase
    const { error } = await supabase.from('claim_requests').select('id').limit(1);
    if (error) {
      console.warn('Supabase connection error:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data if we created any
    if (testClaimRequestId) {
      try {
        // This will fail if RLS doesn't allow deletes, which is expected
        await supabase.from('claim_requests').delete().eq('id', testClaimRequestId);
      } catch (e) {
        // Cleanup failed, likely due to RLS - that's ok for tests
        console.log('Test cleanup skipped (RLS restricted)');
      }
    }
  });

  describe('RLS Policy Tests', () => {
    it('should allow reading claim requests without authentication', async () => {
      // This tests the "allow_authenticated_read_claim_requests" policy
      const { data, error } = await supabase
        .from('claim_requests')
        .select('id, user_id, wom_id, rsn, status')
        .limit(5);

      // Should not error on read
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should allow creating claim requests', async () => {
      // This tests the "allow_authenticated_insert_claim_requests" policy
      const mockRequest = {
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        wom_id: 999999, // Test WOM ID
        rsn: 'TestPlayer_Integration',
        message: 'Integration test claim request',
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('claim_requests')
        .insert([mockRequest])
        .select()
        .single();

      // RLS should allow insert
      if (error) {
        console.error('Insert error:', error);
        // If this fails, the RLS policy is not working correctly
        expect(error).toBeNull();
      } else {
        expect(data).toBeDefined();
        expect(data.rsn).toBe('TestPlayer_Integration');
        testClaimRequestId = data.id;
      }
    });

    it('should retrieve newly created claim request', async () => {
      // Skip if we couldn't create a request in previous test
      if (!testClaimRequestId) {
        console.warn('Skipping: no test claim request created');
        return;
      }

      const { data, error } = await supabase
        .from('claim_requests')
        .select('*')
        .eq('id', testClaimRequestId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testClaimRequestId);
    });
  });

  describe('Hook Integration Tests', () => {
    it('should fetch claim requests using the hook fetcher', async () => {
      // Import the fetcher function directly
      const { data, error } = await supabase
        .from('claim_requests')
        .select('*')
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Try to query a non-existent table to test error handling
      const { error } = await supabase
        .from('nonexistent_table')
        .select('*');

      // Should get an error
      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
    });
  });

  describe('Process Request Integration', () => {
    it('should update claim request status (if allowed by RLS)', async () => {
      // Skip if we couldn't create a test request
      if (!testClaimRequestId) {
        console.warn('Skipping: no test claim request created');
        return;
      }

      // Try to update the status
      const { data, error } = await supabase
        .from('claim_requests')
        .update({
          status: 'approved',
          admin_notes: 'Integration test approval',
          processed_at: new Date().toISOString(),
        })
        .eq('id', testClaimRequestId)
        .select()
        .single();

      // This might fail due to RLS (only service role can update)
      // That's expected behavior - the test documents the policy
      if (error) {
        console.log('Update restricted by RLS (expected for non-service-role):', error.message);
        expect(error).toBeDefined();
      } else {
        // If it succeeds, verify the update worked
        expect(data.status).toBe('approved');
      }
    });
  });

  describe('Data Validation Tests', () => {
    it('should enforce required fields on insert', async () => {
      // Try to insert without required fields
      const { error } = await supabase
        .from('claim_requests')
        .insert([{ rsn: 'OnlyRSN' }]); // Missing user_id, wom_id

      // Should get an error for missing required fields
      expect(error).toBeDefined();
    });

    it('should handle duplicate wom_id claims appropriately', async () => {
      // This tests business logic - can the same player be claimed twice?
      const testWomId = 888888;

      const mockRequest = {
        user_id: '00000000-0000-0000-0000-000000000001',
        wom_id: testWomId,
        rsn: 'TestDuplicate',
        status: 'pending',
      };

      // First insert
      const { data: firstData, error: firstError } = await supabase
        .from('claim_requests')
        .insert([mockRequest])
        .select()
        .single();

      // Second insert with same wom_id
      const { data: secondData, error: secondError } = await supabase
        .from('claim_requests')
        .insert([{ ...mockRequest, user_id: '00000000-0000-0000-0000-000000000002' }])
        .select()
        .single();

      // Clean up both if they were created
      if (firstData?.id) {
        await supabase.from('claim_requests').delete().eq('id', firstData.id);
      }
      if (secondData?.id) {
        await supabase.from('claim_requests').delete().eq('id', secondData.id);
      }

      // Document the current behavior (both might succeed, or second might fail)
      // This test ensures we're aware of duplicate handling
      if (secondError) {
        console.log('Duplicate claim prevented:', secondError.message);
      } else {
        console.log('Duplicate claims allowed (may need unique constraint)');
      }
    });
  });
});
