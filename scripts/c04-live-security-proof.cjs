#!/usr/bin/env node
// F2.7-C04-R1 local-only Programme discovery security proof.
// Every discovery and mutation assertion uses anon or authenticated authority.

'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const API_URL = process.env.C04_API_URL || 'http://127.0.0.1:3000';
const PROGRAMME_A_ID = '11111111-1111-4111-8111-111111111111';
const PROGRAMME_B_ID = '22222222-2222-4222-8222-222222222222';
const REVIEWER_ID = '99999999-9999-4999-8999-999999999992';

function localEnv(name) {
  if (process.env[name]) return process.env[name];
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}=`));
  return line?.slice(name.length + 1) || '';
}

const anonKey = localEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
assert.ok(anonKey, 'Local anon key is required');

function supabaseClient(key, accessToken) {
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

async function authenticatedPersona(email) {
  const authClient = supabaseClient(anonKey);
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: 'password123',
  });
  assert.ifError(error);
  assert.ok(data.session?.access_token, `${email} must receive an access token`);
  return {
    accessToken: data.session.access_token,
    client: supabaseClient(anonKey, data.session.access_token),
  };
}

async function apiProgrammes(accessToken, status) {
  const response = await fetch(`${API_URL}/api/programme?status=${status}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  assert.equal(response.status, 200, `Programme API failed: ${JSON.stringify(body)}`);
  assert.ok(Array.isArray(body.data), 'Programme API must return a data array');
  return body.data;
}

async function run() {
  console.log('--- F2.7-C04-R1 LOCAL PROGRAMME DISCOVERY PROOF ---');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`API: ${API_URL}\n`);

  const reviewer = await authenticatedPersona('reviewer@jkr.gov.my');
  const unauthorized = await authenticatedPersona('unauthorized@external.com');
  console.log('PASS: authenticated member and non-member personas established');

  const memberRead = await reviewer.client
    .from('programme')
    .select('programme_id,status')
    .eq('programme_id', PROGRAMME_A_ID)
    .maybeSingle();
  assert.ifError(memberRead.error);
  assert.equal(memberRead.data?.programme_id, PROGRAMME_A_ID);
  console.log('PASS: active member can discover Programme A at the DB boundary');

  const foreignRead = await reviewer.client
    .from('programme')
    .select('programme_id')
    .eq('programme_id', PROGRAMME_B_ID)
    .maybeSingle();
  assert.ifError(foreignRead.error);
  assert.equal(foreignRead.data, null);
  console.log('PASS: known foreign Programme B ID is not discoverable');

  const inactiveRead = await unauthorized.client
    .from('programme')
    .select('programme_id')
    .eq('programme_id', PROGRAMME_B_ID)
    .maybeSingle();
  assert.ifError(inactiveRead.error);
  assert.equal(inactiveRead.data, null);
  console.log('PASS: inactive Programme B membership grants no discovery');

  const directMembershipRead = await reviewer.client
    .from('programme_membership')
    .select('membership_id')
    .limit(1);
  assert.ok(directMembershipRead.error, 'programme_membership must remain sealed');
  console.log('PASS: direct programme_membership reads remain denied');

  const anon = supabaseClient(anonKey);
  const anonRead = await anon.from('programme').select('programme_id').limit(1);
  assert.ok(anonRead.error, 'anonymous Programme table reads must be denied');
  console.log('PASS: anonymous direct Programme discovery denied');

  const anonymousApi = await fetch(`${API_URL}/api/programme?status=Active`);
  assert.equal(anonymousApi.status, 401);
  console.log('PASS: anonymous Programme API request returns HTTP 401');

  const writeProgrammeId = randomUUID();
  const writeRevisionId = randomUUID();
  const writeResult = await reviewer.client.rpc('a27_create_programme_atomic', {
    p_payload: {
      programme_code: `C04-WR-${writeProgrammeId.slice(0, 8)}`,
      programme_name: 'C04 RLS Write Regression Proof',
    },
    p_actor_id: REVIEWER_ID,
    p_programme_id: writeProgrammeId,
    p_revision_id: writeRevisionId,
    p_audit_id: randomUUID(),
  });
  assert.ifError(writeResult.error);
  assert.equal(writeResult.data?.programme_id, writeProgrammeId);
  assert.equal(writeResult.data?.status, 'Approved');
  console.log('PASS: canonical atomic Programme creation remains operational');

  const archivedProgrammeId = randomUUID();
  const archivedRevisionId = randomUUID();
  const archiveFixture = await reviewer.client.rpc('a27_create_programme_atomic', {
    p_payload: {
      programme_code: `C04-AR-${archivedProgrammeId.slice(0, 8)}`,
      programme_name: 'C04 Archive Regression Proof',
    },
    p_actor_id: REVIEWER_ID,
    p_programme_id: archivedProgrammeId,
    p_revision_id: archivedRevisionId,
    p_audit_id: randomUUID(),
  });
  assert.ifError(archiveFixture.error);
  const archiveResult = await reviewer.client.rpc('a27_archive_programme', {
    p_programme_id: archivedProgrammeId,
    p_actor_id: REVIEWER_ID,
  });
  assert.ifError(archiveResult.error);
  assert.equal(archiveResult.data?.status, 'Archived');
  console.log('PASS: canonical atomic Programme archive remains operational under RLS');

  const activeProgrammes = await apiProgrammes(reviewer.accessToken, 'Active');
  const activeIds = activeProgrammes.map((programme) => programme.id);
  assert.ok(activeIds.includes(PROGRAMME_A_ID));
  assert.ok(activeIds.includes(writeProgrammeId));
  assert.ok(!activeIds.includes(PROGRAMME_B_ID));
  assert.ok(!activeIds.includes(archivedProgrammeId));
  assert.ok(activeProgrammes.every((programme) => programme.status === 'Active'));
  const activeDatabaseRows = await reviewer.client
    .from('programme')
    .select('programme_id,status')
    .in('programme_id', activeIds);
  assert.ifError(activeDatabaseRows.error);
  assert.equal(activeDatabaseRows.data.length, activeIds.length);
  assert.ok(activeDatabaseRows.data.every((programme) => programme.status === 'Approved'));
  console.log(
    'PASS: API member visibility, cross-Programme isolation, and Active -> Approved semantics',
  );

  const archivedProgrammes = await apiProgrammes(reviewer.accessToken, 'Archived');
  assert.ok(archivedProgrammes.some((programme) => programme.id === archivedProgrammeId));
  assert.ok(archivedProgrammes.every((programme) => programme.status === 'Archived'));
  console.log('PASS: Archived discovery mapping remains intact');

  const unauthorizedProgrammes = await apiProgrammes(unauthorized.accessToken, 'Active');
  assert.equal(unauthorizedProgrammes.length, 0);
  console.log('PASS: caller with inactive-only membership discovers no Programmes');

  console.log('\n--- C04 LOCAL SECURITY MATRIX COMPLETE: ALL ASSERTIONS PASSED ---');
}

run().catch((error) => {
  console.error(`FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
});
