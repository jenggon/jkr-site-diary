const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-long';

function createClientForPersona(userId, email) {
    const token = jwt.sign({
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: userId,
        email: email,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        role: 'authenticated'
    }, jwtSecret);

    return createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
    });
}

async function runLiveTests() {
    console.log('--- STARTING LIVE DB TESTS ---');
    
    // Test P3 - Unauthorized
    console.log('\n[P3 Unauthorized Persona]');
    const clientP3 = createClientForPersona('99999999-9999-9999-9999-999999999993', 'unauthorized@jkr.gov.my');
    const p3Programmes = await clientP3.from('programme').select('*');
    console.log('P3 Programme data (should be 0 or permission denied):', p3Programmes.data?.length, p3Programmes.error?.message);

    // Test P1 - Submitter
    console.log('\n[P1 Submitter Persona]');
    const clientP1 = createClientForPersona('99999999-9999-9999-9999-999999999991', 'submitter@jkr.gov.my');
    
    const p1Programmes = await clientP1.from('programme').select('*');
    console.log('P1 Programme data:', p1Programmes.data?.length, 'error:', p1Programmes.error?.message);
    
    const p1Diary = await clientP1.from('site_diary').select('*');
    console.log('P1 Site Diary data:', p1Diary.data?.length, 'error:', p1Diary.error?.message);
    
    // P1 approve
    const p1Approve = await clientP1.rpc('a27_update_approval_atomic', {
        p_approval_id: '66666666-6666-6666-6666-666666666661',
        p_payload: { approval_status: 'Approved', approval_comment: 'I am subverting' },
        p_actor_id: '99999999-9999-9999-9999-999999999991',
        p_audit_id: '10000000-0000-0000-0000-000000000000',
        p_expected_sd_last_modified_at: null
    });
    console.log('P1 Approve RPC (should fail):', p1Approve.error ? p1Approve.error.message : 'SUCCESS');

    // Test P2 - Reviewer
    console.log('\n[P2 Reviewer Persona]');
    const clientP2 = createClientForPersona('99999999-9999-9999-9999-999999999992', 'reviewer@jkr.gov.my');
    
    const p2Approvals = await clientP2.from('approval').select('*');
    console.log('P2 Approval access count (should be >=1):', p2Approvals.data?.length, p2Approvals.error?.message);
    
    const p2Approve = await clientP2.rpc('a27_update_approval_atomic', {
        p_approval_id: '66666666-6666-6666-6666-666666666661',
        p_payload: { approval_status: 'Approved', approval_comment: 'Legitimate approval' },
        p_actor_id: '99999999-9999-9999-9999-999999999992',
        p_audit_id: '20000000-0000-0000-0000-000000000000',
        p_expected_sd_last_modified_at: '2026-08-11T00:00:00.000Z'
    });
    console.log('P2 Approve RPC message (expecting success or concurrency error):', p2Approve.error ? p2Approve.error.message : 'SUCCESS');
}

runLiveTests().catch(console.error);
