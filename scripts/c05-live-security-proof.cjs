#!/usr/bin/env node
// F2.7-C05-R1 local-only authenticated Programme-context HTTP proof.

'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const API_URL = process.env.C05_API_URL || 'http://127.0.0.1:3000';
const PROGRAMME_A_ID = '11111111-1111-1111-1111-111111111111';
const PROGRAMME_B_ID = '22222222-2222-2222-2222-222222222222';
const PROGRAMME_A_ACTIVITY_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const PROGRAMME_B_ACTIVITY_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const INTERNAL_ERROR = /42501|permission denied|Database error|PostgREST/i;

function localEnv(name) {
  if (process.env[name]) return process.env[name];
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}=`));
  return line?.slice(name.length + 1) || '';
}

const anonKey = localEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
assert.ok(anonKey, 'Local anon key is required');

function authClient() {
  return createClient(SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function accessToken(email) {
  const { data, error } = await authClient().auth.signInWithPassword({
    email,
    password: 'password123',
  });
  assert.ifError(error);
  assert.ok(data.session?.access_token, `${email} must receive an access token`);
  return data.session.access_token;
}

async function api(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  const text = await response.text();
  assert.doesNotMatch(text, INTERNAL_ERROR, `${path} leaked an internal database error`);
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    assert.fail(`${path} returned non-JSON content: ${text}`);
  }
  return { status: response.status, body };
}

function utcDateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function expectAnonymous401(paths) {
  for (const path of paths) {
    const response = await api(path);
    assert.equal(response.status, 401, `${path} must reject anonymous callers`);
  }
}

async function run() {
  console.log('--- F2.7-C05-R1 LOCAL AUTHENTICATED CONTEXT PROOF ---');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`API: ${API_URL}\n`);

  const p1 = await accessToken('submitter@jkr.gov.my');
  const p3 = await accessToken('unauthorized@external.com');
  console.log('PASS: P1 active member and P3 inactive-only personas authenticated');

  const anonymousPaths = [
    `/api/programme/${PROGRAMME_A_ID}`,
    `/api/project-summary?programmeId=${PROGRAMME_A_ID}`,
    `/api/ahi?programmeId=${PROGRAMME_A_ID}`,
    `/api/workpackages?building=1&programmeId=${PROGRAMME_A_ID}`,
    `/api/reports?date=${utcDateOffset(-1)}`,
    `/api/activities/open?programmeId=${PROGRAMME_A_ID}`,
  ];
  await expectAnonymous401(anonymousPaths);
  console.log('PASS: all affected route families reject anonymous callers with HTTP 401');

  const programmeA = await api(`/api/programme/${PROGRAMME_A_ID}`, p1);
  assert.equal(programmeA.status, 200, JSON.stringify(programmeA.body));
  assert.equal(programmeA.body?.data?.programmeId, PROGRAMME_A_ID);
  console.log('PASS: P1 Programme A detail succeeds');

  const programmeB = await api(`/api/programme/${PROGRAMME_B_ID}`, p1);
  assert.ok([200, 404].includes(programmeB.status), JSON.stringify(programmeB.body));
  if (programmeB.status === 200) {
    assert.equal(programmeB.body?.data?.programmeId, PROGRAMME_B_ID);
    console.log('PASS: P1 Programme B detail succeeds for the optional B02-A membership fixture');
  } else {
    console.log(
      'PASS: P1 Programme B is safely hidden because this local fixture has no active P1 membership',
    );
  }

  for (const programmeId of [PROGRAMME_A_ID, PROGRAMME_B_ID]) {
    const foreign = await api(`/api/programme/${programmeId}`, p3);
    assert.equal(foreign.status, 404, JSON.stringify(foreign.body));
    assert.deepEqual(foreign.body, { error: 'Programme not found' });
  }
  console.log('PASS: P3 inactive/non-member Programme detail is a non-revealing HTTP 404');

  const projectSummary = await api(`/api/project-summary?programmeId=${PROGRAMME_A_ID}`, p1);
  assert.equal(projectSummary.status, 200, JSON.stringify(projectSummary.body));
  const p3ProjectSummary = await api(`/api/project-summary?programmeId=${PROGRAMME_A_ID}`, p3);
  assert.equal(p3ProjectSummary.status, 404, JSON.stringify(p3ProjectSummary.body));
  console.log('PASS: Project Summary allows P1 and safely hides foreign Programme context from P3');

  const ahi = await api(`/api/ahi?programmeId=${PROGRAMME_A_ID}`, p1);
  assert.equal(ahi.status, 200, JSON.stringify(ahi.body));
  assert.ok(Array.isArray(ahi.body));
  const p3Ahi = await api(`/api/ahi?programmeId=${PROGRAMME_A_ID}`, p3);
  assert.equal(p3Ahi.status, 404, JSON.stringify(p3Ahi.body));

  const workpackages = await api(`/api/workpackages?building=1&programmeId=${PROGRAMME_A_ID}`, p1);
  assert.equal(workpackages.status, 200, JSON.stringify(workpackages.body));
  assert.ok(Array.isArray(workpackages.body));
  const p3Workpackages = await api(
    `/api/workpackages?building=1&programmeId=${PROGRAMME_A_ID}`,
    p3,
  );
  assert.equal(p3Workpackages.status, 404, JSON.stringify(p3Workpackages.body));
  console.log('PASS: AHI and Workpackages allow P1 and reveal no foreign Programme data to P3');

  const programmeADate = utcDateOffset(-1);
  const programmeBDate = utcDateOffset(-2);
  const p1Reports = await api(`/api/reports?date=${programmeADate}`, p1);
  assert.equal(p1Reports.status, 200, JSON.stringify(p1Reports.body));
  assert.ok(Array.isArray(p1Reports.body));
  assert.ok(
    p1Reports.body.some((report) => report.programme_id === PROGRAMME_A_ID),
    'P1 must receive the seeded Programme A report',
  );
  assert.ok(p1Reports.body.every((report) => report.programme_id === PROGRAMME_A_ID));

  for (const date of [programmeADate, programmeBDate]) {
    const reports = await api(`/api/reports?date=${date}`, p3);
    assert.equal(reports.status, 200, JSON.stringify(reports.body));
    assert.ok(Array.isArray(reports.body));
    assert.equal(reports.body.length, 0, `P3 received foreign report data for ${date}`);
  }
  console.log(
    'PASS: Reports returns P1 Programme A data and zero foreign Programme A/B rows to P3',
  );

  const openA = await api(`/api/activities/open?programmeId=${PROGRAMME_A_ID}`, p1);
  assert.equal(openA.status, 200, JSON.stringify(openA.body));
  assert.ok(Array.isArray(openA.body?.data));
  assert.ok(
    openA.body.data.some((activity) => activity.activityId === PROGRAMME_A_ACTIVITY_ID),
    'P1 must receive the seeded Programme A open Activity',
  );
  assert.ok(openA.body.data.every((activity) => activity.programmeId === PROGRAMME_A_ID));

  if (programmeB.status === 200) {
    const openB = await api(`/api/activities/open?programmeId=${PROGRAMME_B_ID}`, p1);
    assert.equal(openB.status, 200, JSON.stringify(openB.body));
    assert.ok(
      openB.body?.data?.some((activity) => activity.activityId === PROGRAMME_B_ACTIVITY_ID),
      'P1 must receive the seeded Programme B open Activity',
    );
  }

  const p3OpenB = await api(`/api/activities/open?programmeId=${PROGRAMME_B_ID}`, p3);
  assert.equal(p3OpenB.status, 200, JSON.stringify(p3OpenB.body));
  assert.deepEqual(p3OpenB.body, { data: [] });
  console.log(
    'PASS: Open Activities allows P1 Programme context and returns no Programme B data to P3',
  );

  console.log('\n--- C05 LOCAL SECURITY MATRIX COMPLETE: ALL ASSERTIONS PASSED ---');
}

run().catch((error) => {
  console.error(`FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
});
