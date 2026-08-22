const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function createClientForPersona(email) {
    const client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: 'password123'
    });

    if (error) {
        console.error(`Login failed for ${email}: ${error.message}`);
        process.exit(1);
    }

    // Validate identity
    const sessionUser = (await client.auth.getUser()).data.user;
    assert.ok(sessionUser, 'Auth session user must exist');
    assert.strictEqual(sessionUser.email, email, 'Session email must match');

    return client;
}

async function runLiveTests() {
    console.log('--- STARTING LIVE DB TESTS ---');

    // --- P3 UNAUTHORIZED PERSONA ---
    console.log('\n[P3 Unauthorized Persona]');
    const clientP3 = await createClientForPersona('unauthorized@jkr.gov.my');
    console.log('PASS: P3 Authentication succeeded');

    // Test P3 - unauthorized operations
    // Note: If no SELECT RLS on programme, we expect either 0 rows or permission denied
    const p3Programmes = await clientP3.from('programme').select('*');
    if (p3Programmes.error) {
        assert.ok(p3Programmes.error.message.includes('permission denied'), 'P3 should be denied programme access');
    } else {
        assert.strictEqual(p3Programmes.data.length, 0, 'P3 should see 0 programmes');
    }
    console.log('PASS: P3 Programme access denied or returned 0');

    // --- P1 SUBMITTER PERSONA ---
    console.log('\n[P1 Submitter Persona]');
    const clientP1 = await createClientForPersona('submitter@jkr.gov.my');
    console.log('PASS: P1 Authentication succeeded');

    // Test P1 Approval capability denial (must fail gracefully via RPC boundary)
    const p1Approve = await clientP1.rpc('a27_update_approval_atomic', {
        p_approval_id: '66666666-6666-6666-6666-666666666661',
        p_payload: { approval_status: 'Approved', approval_comment: 'I am subverting' },
        p_actor_id: '99999999-9999-9999-9999-999999999991',
        p_audit_id: '10000000-0000-0000-0000-000000000000',
        p_expected_sd_last_modified_at: null
    });
    assert.ok(p1Approve.error, 'P1 must fail approval update');
    assert.ok(p1Approve.error.message.includes('F24_UNAUTHORIZED_CAPABILITY'), 'P1 must get exact capability error');
    console.log('PASS: P1 Approval capability denial verified');

    // --- P2 REVIEWER PERSONA ---
    console.log('\n[P2 Reviewer Persona]');
    const clientP2 = await createClientForPersona('reviewer@jkr.gov.my');
    console.log('PASS: P2 Authentication succeeded');

    // Test P2 Approval concurrency guard (must fail specifically with F24_SITE_DIARY_STALE when date is invalid)
    const p2ApproveStale = await clientP2.rpc('a27_update_approval_atomic', {
        p_approval_id: '66666666-6666-6666-6666-666666666661',
        p_payload: { approval_status: 'Approved', approval_comment: 'Legitimate approval' },
        p_actor_id: '99999999-9999-9999-9999-999999999992',
        p_audit_id: '20000000-0000-0000-0000-000000000000',
        p_expected_sd_last_modified_at: '2026-08-21T00:00:00.000Z'
    });

    assert.ok(p2ApproveStale.error, 'P2 stale update must fail');
    assert.ok(p2ApproveStale.error.message.includes('F24_SITE_DIARY_STALE'), 'P2 must get exact concurrency stale error');
    console.log('PASS: P2 Approval concurrency guard verified');

    // Test Approval queue authority
    const p1Queue = await clientP1.rpc('f24_get_site_diary_approval_queue', { p_programme_id: '11111111-1111-1111-1111-111111111111' });
    if (p1Queue.error && p1Queue.error.message.includes('permission denied')) {
        assert.fail('P1 queue read hit schema defect instead of domain denial: ' + p1Queue.error.message);
    }
    assert.ok(p1Queue.error || (p1Queue.data && p1Queue.data.length === 0), `P1 should not see approval queue items, got error: ${p1Queue.error?.message}`);

    const p2Queue = await clientP2.rpc('f24_get_site_diary_approval_queue', { p_programme_id: '11111111-1111-1111-1111-111111111111' });
    assert.ok(!p2Queue.error && p2Queue.data && p2Queue.data.length > 0, `P2 should be able to read approval queue, got error: ${p2Queue.error?.message}`);
    console.log('PASS: Approval queue authority verified');

    // Test Exact Approval review authority
    const p1Review = await clientP1.rpc('f24_get_site_diary_approval_review', { p_approval_id: '66666666-6666-6666-6666-666666666661' });
    if (p1Review.error && p1Review.error.message.includes('permission denied')) {
        assert.fail('P1 review read hit schema defect instead of domain denial: ' + p1Review.error.message);
    }
    assert.ok(p1Review.error || (p1Review.data && p1Review.data.length === 0), `P1 should not be able to read approval review details, got error: ${p1Review.error?.message}`);

    const p2Review = await clientP2.rpc('f24_get_site_diary_approval_review', { p_approval_id: '66666666-6666-6666-6666-666666666661' });
    assert.ok(!p2Review.error && p2Review.data && p2Review.data.length > 0, `P2 should be able to read approval review details, got error: ${p2Review.error?.message}`);
    console.log('PASS: Exact Approval review authority verified');

    // Test Exact Print read authority
    const p3Print = await clientP3.rpc('f25_get_site_diary_print_read', { p_site_diary_id: '55555555-5555-5555-5555-555555555551' });
    if (p3Print.error && p3Print.error.message.includes('permission denied')) {
        assert.fail('P3 print read hit schema defect instead of domain denial: ' + p3Print.error.message);
    }
    assert.ok(p3Print.error || !p3Print.data || p3Print.data.length === 0, 'P3 should not be able to read print data');

    const p1Print = await clientP1.rpc('f25_get_site_diary_print_read', { p_site_diary_id: '55555555-5555-5555-5555-555555555551' });
    assert.ok(!p1Print.error && p1Print.data, `P1 should be able to read print data, got error: ${p1Print.error?.message}`);
    console.log('PASS: Exact Print read authority verified');

    // Test Historical exact Print preserves historical revision/siteDiary identity
    const p1HistPrint = await clientP1.rpc('f25_get_site_diary_print_read', { p_site_diary_id: '55555555-5555-5555-5555-555555555553' });
    assert.ok(!p1HistPrint.error && p1HistPrint.data, `Historical print should succeed, got error: ${p1HistPrint.error?.message}`);
    
    // Ensure the data points to the historical revision
    const histData = p1HistPrint.data;
    assert.strictEqual(histData.revision_id, '77777777-7777-7777-7777-777777777777', 'Must preserve historical revision ID');
    console.log('PASS: Historical Print identity preservation verified');

    // Test P2 Approval authorization pass (must succeed without error when passed correctly)
    const p2ApproveValid = await clientP2.rpc('a27_update_approval_atomic', {
        p_approval_id: '66666666-6666-6666-6666-666666666661',
        p_payload: { approval_status: 'Approved', approval_comment: 'Legitimate approval' },
        p_actor_id: '99999999-9999-9999-9999-999999999992',
        p_audit_id: '20000000-0000-0000-0000-000000000000',
        p_expected_sd_last_modified_at: '2026-08-21T12:00:00.000Z'
    });

    assert.ok(!p2ApproveValid.error, `P2 valid update must succeed, got: ${p2ApproveValid.error?.message}`);
    console.log('PASS: P2 Approval authorization pass verified');

    console.log('\n--- ALL ASSERTIONS PASSED ---');

    console.log('\n--- ALL ASSERTIONS PASSED ---');
}

runLiveTests().catch(err => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
