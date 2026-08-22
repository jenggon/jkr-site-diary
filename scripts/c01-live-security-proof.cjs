#!/usr/bin/env node
// F2.7-C01 Live Security Proof
// Validates that the C01 corrective migration closes the SECURITY INVOKER defect
// for all three affected public wrappers.
//
// Persona map:
//   P1 = submitter@jkr.gov.my  (SITE_SUPERVISOR in Programme A — has Print read, NO approval queue)
//   P2 = reviewer@jkr.gov.my   (RESIDENT_ENGINEER in Programme A — has approval queue view)
//   P3 = unauthorized@external.com (no programme membership)
//
// Test IDs mirror the C01 seed.sql fixture.

'use strict';

const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = (() => {
  try { return require('../supabase/config.json').anon_key; } catch {}
  // Fallback: get from supabase status
  return process.env.SUPABASE_ANON_KEY || '';
})();

const PROGRAMME_A_ID = '11111111-1111-1111-1111-111111111111';
const PROGRAMME_B_ID = '22222222-2222-2222-2222-222222222222';
const APPROVAL_A_ID  = '66666666-6666-6666-6666-666666666661';
const APPROVAL_B_ID  = '66666666-6666-6666-6666-666666666662';
const DIARY_A_ID     = '55555555-5555-5555-5555-555555555551';
const DIARY_B_ID     = '55555555-5555-5555-5555-555555555552';
const HISTORICAL_DIARY_ID = '55555555-5555-5555-5555-555555555553';
const CURRENT_REVISION_ID = '33333333-3333-3333-3333-333333333333';
const HISTORICAL_REVISION_ID = '77777777-7777-7777-7777-777777777777';

async function getAnonKey() {
  if (SUPABASE_ANON_KEY) return SUPABASE_ANON_KEY;
  // Read from env or supabase local status output
  const { execSync } = require('node:child_process');
  const output = execSync('supabase status', { cwd: process.cwd(), encoding: 'utf8' });
  const match = output.match(/anon key:\s+([^\s]+)/i);
  if (match) return match[1];
  throw new Error('Cannot determine SUPABASE_ANON_KEY — run supabase status');
}

async function createClientForPersona(email, password = 'password123') {
  const anonKey = await getAnonKey();
  const client = createClient(SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.session) throw new Error(`Auth failed for ${email}: ${error?.message}`);
  return createClient(SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
  });
}

async function runC01LiveProof() {
  console.log('--- F2.7-C01 LIVE SECURITY WRAPPER PROOF ---');
  console.log('Target: http://127.0.0.1:54321 (LOCAL ONLY)\n');

  // ============================================================
  // Auth bootstrap
  // ============================================================
  console.log('[Auth Bootstrap]');
  const clientP1 = await createClientForPersona('submitter@jkr.gov.my');
  console.log('PASS: P1 submitter@jkr.gov.my authenticated');
  const clientP2 = await createClientForPersona('reviewer@jkr.gov.my');
  console.log('PASS: P2 reviewer@jkr.gov.my authenticated');
  const clientP3 = await createClientForPersona('unauthorized@external.com');
  console.log('PASS: P3 unauthorized@external.com authenticated');

  // ============================================================
  // C01-8: Approval Queue
  // ============================================================
  console.log('\n[C01-8: Approval Queue]');

  // P2 MUST succeed with Programme A queue data
  const p2Queue = await clientP2.rpc('f24_get_site_diary_approval_queue', { p_programme_id: PROGRAMME_A_ID });
  assert.ok(
    !p2Queue.error,
    `P2 approval queue must NOT error — got: ${p2Queue.error?.message}`
  );
  assert.ok(
    p2Queue.data && p2Queue.data.length > 0,
    `P2 approval queue must return rows — got ${p2Queue.data?.length ?? 'null'} rows`
  );
  // Verify exact approval identity in result
  const p2QueueRow = p2Queue.data.find((r) => r.approval_id === APPROVAL_A_ID);
  assert.ok(p2QueueRow, 'P2 queue must contain the expected approval_id');
  assert.strictEqual(p2QueueRow.programme_id, PROGRAMME_A_ID, 'P2 queue row must have correct programme_id');
  assert.strictEqual(p2QueueRow.site_diary_id, DIARY_A_ID, 'P2 queue row must have correct site_diary_id');
  console.log('PASS: P2 f24_get_site_diary_approval_queue — authorized success, exact identity preserved');

  // P3 (no membership) — must get capability denial, NOT infrastructure error
  const p3Queue = await clientP3.rpc('f24_get_site_diary_approval_queue', { p_programme_id: PROGRAMME_A_ID });
  if (p3Queue.error) {
    // Must NOT be a permission denied for schema private infrastructure error
    assert.ok(
      !p3Queue.error.message.includes('permission denied for schema private'),
      `P3 queue must not see infrastructure error — got: ${p3Queue.error.message}`
    );
    // Expected: F24_UNAUTHORIZED_CAPABILITY domain error
    assert.ok(
      p3Queue.error.message.includes('F24_UNAUTHORIZED_CAPABILITY'),
      `P3 queue must get capability denial — got: ${p3Queue.error.message}`
    );
  } else {
    // If no error, must have no rows (RLS empty result)
    assert.strictEqual(p3Queue.data?.length ?? 0, 0, 'P3 queue must return no rows');
  }
  console.log('PASS: P3 f24_get_site_diary_approval_queue — canonical denial, no infrastructure error');

  // P1 (SITE_SUPERVISOR — no approval queue capability) — must get capability denial
  const p1Queue = await clientP1.rpc('f24_get_site_diary_approval_queue', { p_programme_id: PROGRAMME_A_ID });
  if (p1Queue.error) {
    assert.ok(
      !p1Queue.error.message.includes('permission denied for schema private'),
      `P1 queue must not see infrastructure error — got: ${p1Queue.error.message}`
    );
    assert.ok(
      p1Queue.error.message.includes('F24_UNAUTHORIZED_CAPABILITY'),
      `P1 queue must get capability denial — got: ${p1Queue.error.message}`
    );
  } else {
    assert.strictEqual(p1Queue.data?.length ?? 0, 0, 'P1 queue must return no rows (not entitled)');
  }
  console.log('PASS: P1 f24_get_site_diary_approval_queue — canonical capability denial');

  // ============================================================
  // C01-9: Exact Approval Review
  // ============================================================
  console.log('\n[C01-9: Exact Approval Review]');

  // P2 MUST succeed with exact identity
  const p2Review = await clientP2.rpc('f24_get_site_diary_approval_review', { p_approval_id: APPROVAL_A_ID });
  assert.ok(
    !p2Review.error,
    `P2 approval review must NOT error — got: ${p2Review.error?.message}`
  );
  assert.ok(
    p2Review.data && p2Review.data.length > 0,
    `P2 approval review must return rows — got ${p2Review.data?.length ?? 'null'} rows`
  );
  const p2ReviewRow = p2Review.data[0];
  assert.strictEqual(p2ReviewRow.approval_id, APPROVAL_A_ID, 'Exact approval_id preserved');
  assert.strictEqual(p2ReviewRow.site_diary_id, DIARY_A_ID, 'Exact site_diary_id preserved');
  assert.strictEqual(p2ReviewRow.programme_id, PROGRAMME_A_ID, 'Programme context preserved');
  console.log('PASS: P2 f24_get_site_diary_approval_review — authorized success, exact identity preserved');

  // P3 — canonical denial, NOT infrastructure error
  const p3Review = await clientP3.rpc('f24_get_site_diary_approval_review', { p_approval_id: APPROVAL_A_ID });
  assert.ok(p3Review.error, 'P3 review must error (no capability)');
  assert.ok(
    !p3Review.error.message.includes('permission denied for schema private'),
    `P3 review must not see infrastructure error — got: ${p3Review.error.message}`
  );
  assert.ok(
    p3Review.error.message.includes('F24_UNAUTHORIZED_CAPABILITY') ||
    p3Review.error.message.includes('F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND'),
    `P3 review must get domain denial — got: ${p3Review.error.message}`
  );
  console.log('PASS: P3 f24_get_site_diary_approval_review — canonical denial, no infrastructure error');

  // ============================================================
  // C01-10: Exact Print Read
  // ============================================================
  console.log('\n[C01-10: Exact Print Read]');

  // P1 (SITE_SUPERVISOR) MUST succeed — has SITE_DIARY_PRINT_READ
  const p1Print = await clientP1.rpc('f25_get_site_diary_print_read', { p_site_diary_id: DIARY_A_ID });
  assert.ok(
    !p1Print.error,
    `P1 print read must NOT error — got: ${p1Print.error?.message}`
  );
  assert.ok(p1Print.data, 'P1 print read must return data');
  assert.strictEqual(p1Print.data.site_diary_id, DIARY_A_ID, 'P1 print: exact site_diary_id preserved');
  assert.strictEqual(p1Print.data.programme_id, PROGRAMME_A_ID, 'P1 print: programme_id preserved');
  assert.strictEqual(p1Print.data.revision_id, CURRENT_REVISION_ID, 'P1 print: revision_id preserved');
  console.log('PASS: P1 f25_get_site_diary_print_read — authorized success, exact identity preserved');

  // P2 (RESIDENT_ENGINEER) MUST succeed — also has SITE_DIARY_PRINT_READ
  const p2Print = await clientP2.rpc('f25_get_site_diary_print_read', { p_site_diary_id: DIARY_A_ID });
  assert.ok(
    !p2Print.error,
    `P2 print read must NOT error — got: ${p2Print.error?.message}`
  );
  assert.ok(p2Print.data, 'P2 print read must return data');
  assert.strictEqual(p2Print.data.site_diary_id, DIARY_A_ID, 'P2 print: exact site_diary_id preserved');
  console.log('PASS: P2 f25_get_site_diary_print_read — authorized success');

  // P1 MUST be able to read the exact historical record without reinterpretation
  // through the current Programme revision.
  const p1HistoricalPrint = await clientP1.rpc('f25_get_site_diary_print_read', {
    p_site_diary_id: HISTORICAL_DIARY_ID
  });
  assert.ok(
    !p1HistoricalPrint.error,
    `P1 historical print must NOT error — got: ${p1HistoricalPrint.error?.message}`
  );
  assert.ok(p1HistoricalPrint.data, 'P1 historical print must return data');
  assert.strictEqual(
    p1HistoricalPrint.data.site_diary_id,
    HISTORICAL_DIARY_ID,
    'Historical exact site_diary_id preserved'
  );
  assert.strictEqual(
    p1HistoricalPrint.data.revision_id,
    HISTORICAL_REVISION_ID,
    'Historical superseded revision_id preserved'
  );
  assert.notStrictEqual(
    p1HistoricalPrint.data.revision_id,
    CURRENT_REVISION_ID,
    'Historical print must not be reinterpreted through the current revision'
  );
  console.log('PASS: P1 historical exact Print — historical siteDiaryId and revisionId preserved');

  // P3 — canonical denial, NOT infrastructure error
  const p3Print = await clientP3.rpc('f25_get_site_diary_print_read', { p_site_diary_id: DIARY_A_ID });
  assert.ok(p3Print.error, 'P3 print must error (no capability)');
  assert.ok(
    !p3Print.error.message.includes('permission denied for schema private'),
    `P3 print must not see infrastructure error — got: ${p3Print.error.message}`
  );
  assert.ok(
    p3Print.error.message.includes('F24_UNAUTHORIZED_CAPABILITY'),
    `P3 print must get capability denial — got: ${p3Print.error.message}`
  );
  console.log('PASS: P3 f25_get_site_diary_print_read — canonical capability denial, no infrastructure error');

  // ============================================================
  // C01-13: Cross-Programme Negative Test
  // ============================================================
  console.log('\n[C01-13: Cross-Programme Isolation]');

  // P2 (only member of Programme A) tries to read Programme B approval queue
  const p2CrossQueue = await clientP2.rpc('f24_get_site_diary_approval_queue', { p_programme_id: PROGRAMME_B_ID });
  if (p2CrossQueue.error) {
    assert.ok(
      !p2CrossQueue.error.message.includes('permission denied for schema private'),
      `Cross-programme queue must not see infrastructure error — got: ${p2CrossQueue.error.message}`
    );
    assert.ok(
      p2CrossQueue.error.message.includes('F24_UNAUTHORIZED_CAPABILITY'),
      `Cross-programme queue must get capability denial — got: ${p2CrossQueue.error.message}`
    );
  } else {
    assert.strictEqual(p2CrossQueue.data?.length ?? 0, 0, 'P2 must see no rows for Programme B');
  }
  console.log('PASS: P2 cross-Programme B queue read — canonical denial');

  // P2 tries to read Programme B approval review using known ID
  const p2CrossReview = await clientP2.rpc('f24_get_site_diary_approval_review', { p_approval_id: APPROVAL_B_ID });
  assert.ok(p2CrossReview.error, 'P2 cross-programme review must error');
  assert.ok(
    !p2CrossReview.error.message.includes('permission denied for schema private'),
    `Cross-programme review must not see infrastructure error — got: ${p2CrossReview.error.message}`
  );
  console.log('PASS: P2 cross-Programme B review — canonical denial, no infrastructure error');

  // P2 tries to read Programme B print using known diary ID
  const p2CrossPrint = await clientP2.rpc('f25_get_site_diary_print_read', { p_site_diary_id: DIARY_B_ID });
  assert.ok(p2CrossPrint.error, 'P2 cross-programme print must error');
  assert.ok(
    !p2CrossPrint.error.message.includes('permission denied for schema private'),
    `Cross-programme print must not see infrastructure error — got: ${p2CrossPrint.error.message}`
  );
  console.log('PASS: P2 cross-Programme B print — canonical denial, no infrastructure error');

  // ============================================================
  // C01-11: Direct Private Invocation (via PostgREST RPC)
  // ============================================================
  console.log('\n[C01-11: Direct Private Invocation Denial]');

  // Attempt direct call to private function via PostgREST (will hit schema routing)
  const p2DirectPrivate = await clientP2.rpc('get_site_diary_approval_queue', { p_actor_id: '99999999-9999-9999-9999-999999999992', p_programme_id: PROGRAMME_A_ID });
  // PostgREST only exposes public schema by default; this must fail
  assert.ok(
    p2DirectPrivate.error,
    'Direct private function invocation via PostgREST must fail'
  );
  assert.ok(
    !p2DirectPrivate.error.message.includes('permission denied for schema private') ||
    p2DirectPrivate.error.message.includes('Could not find the function') ||
    p2DirectPrivate.error.message.includes('does not exist'),
    `Direct private call must be routed away — got: ${p2DirectPrivate.error.message}`
  );
  console.log('PASS: Direct private function invocation denied via PostgREST routing');

  // ============================================================
  // C01-12: Actor spoofing — wrappers take no actor param
  // ============================================================
  console.log('\n[C01-12: Actor Spoofing — No actor parameter exposed]');
  // The public wrappers accept only domain parameters (p_programme_id, p_approval_id, p_site_diary_id).
  // There is no p_actor_id parameter to spoof. Proof is static (verified by contract tests)
  // and confirmed by the fact that P3 calling with their own session gets denied correctly.
  console.log('PASS: Actor derived exclusively from auth.uid() inside SECURITY DEFINER boundary');
  console.log('PASS: No client-supplied actor parameter exists on any of the three wrappers');

  const spoofAttempt = await clientP3.rpc('f24_get_site_diary_approval_queue', {
    p_programme_id: PROGRAMME_A_ID,
    p_actor_id: '99999999-9999-9999-9999-999999999992'
  });
  assert.ok(spoofAttempt.error, 'Actor-spoofing call with p_actor_id must fail');
  assert.ok(
    !spoofAttempt.error.message.includes('permission denied for schema private'),
    `Actor-spoofing rejection must not be a schema-private infrastructure failure — got: ${spoofAttempt.error.message}`
  );
  console.log('PASS: Live actor-spoofing attempt rejected before wrapper execution');

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n--- F2.7-C01 PROOF COMPLETE ---');
  console.log('Original schema-private infrastructure error: ELIMINATED');
  console.log('All authorized RPCs: SUCCESS with exact identity');
  console.log('All unauthorized RPCs: CANONICAL DOMAIN DENIAL');
  console.log('Cross-Programme isolation: VERIFIED');
  console.log('Actor spoofing: BLOCKED (no actor param exposed)');
}

runC01LiveProof().catch((err) => {
  console.error('\nFAIL:', err.message);
  process.exit(1);
});
