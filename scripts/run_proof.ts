import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function main() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  const progA = '11111111-1111-1111-1111-111111111111';
  const progB = '22222222-2222-2222-2222-222222222222';
  
  const pmId = '99999999-9999-9999-9999-999999999991'; // Submitter (Now PM on Prog A, SS on Prog B)
  const ssId = '99999999-9999-9999-9999-999999999992'; // Reviewer (RE on Prog A)
  


  const getAccessToken = async (email: string) => {
    const { data, error } = await adminClient.auth.signInWithPassword({ email, password: 'password123' });
    if (error) throw error;
    return { token: data.session?.access_token, user: data.user };
  };

  const pmAuth = await getAccessToken('submitter@jkr.gov.my');
  const ssAuth = await getAccessToken('reviewer@jkr.gov.my');

  console.log('\n--- Matrix Tests ---');

  const pmClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${pmAuth.token}` } } });
  const ssClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${ssAuth.token}` } } });
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Anonymous HTTP PATCH -> 401
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/programme?programme_id=eq.${progA}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ programme_name: 'Hacked' })
  });
  console.log('Anonymous PATCH HTTP:', patchRes.status === 401 ? 'DENIED (401)' : patchRes.status);

  // 1b. Anonymous RPC
  const anonRpc = await anonClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: pmAuth.user!.id, p_audit_id: '00000000-0000-0000-0000-000000000000' });
  console.log('Anonymous RPC:', anonRpc.error ? 'DENIED' : 'ALLOWED', anonRpc.error?.message);

  // 2. Direct table UPDATE
  const directUpdate = await pmClient.from('programme').update({ programme_name: 'Hacked' }).eq('programme_id', progA);
  console.log('Direct Table UPDATE:', directUpdate.error ? 'DENIED' : 'ALLOWED', directUpdate.error?.message);

  // 3. Wrong Role / Capability (SS)
  const ssRpc = await ssClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: ssAuth.user!.id, p_audit_id: '00000000-0000-0000-0000-000000000001' });
  console.log('SS (No Capability) RPC:', ssRpc.error ? 'DENIED' : 'ALLOWED', ssRpc.error?.code, ssRpc.error?.message);

  // 4. Foreign Programme
  const foreignRpc = await pmClient.rpc('c06_update_programme_atomic', { p_programme_id: progB, p_payload: {}, p_actor_id: pmAuth.user!.id, p_audit_id: '00000000-0000-0000-0000-000000000002' });
  console.log('Foreign Programme RPC:', foreignRpc.error ? 'DENIED' : 'ALLOWED', foreignRpc.error?.code, foreignRpc.error?.message);

  // 5. Actor Forgery
  const forgeRpc = await pmClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: ssAuth.user!.id, p_audit_id: '00000000-0000-0000-0000-000000000003' });
  console.log('Actor Forgery RPC:', forgeRpc.error ? 'DENIED' : 'ALLOWED', forgeRpc.error?.code, forgeRpc.error?.message);

  // 6. Authorized Success
  const validAuditId = crypto.randomUUID();
  const successRpc = await pmClient.rpc('c06_update_programme_atomic', { 
    p_programme_id: progA, 
    p_payload: { programme_name: 'Updated by PM' }, 
    p_actor_id: pmAuth.user!.id, 
    p_audit_id: validAuditId 
  });
  console.log('Authorized Success RPC:', successRpc.error ? 'FAILED' : 'SUCCESS', successRpc.error?.message);

  // 7. Atomic Rollback (duplicate audit id)
  const failRpc = await pmClient.rpc('c06_update_programme_atomic', { 
    p_programme_id: progA, 
    p_payload: { programme_name: 'Updated by PM 2' }, 
    p_actor_id: pmAuth.user!.id, 
    p_audit_id: validAuditId 
  });
  console.log('Atomic Rollback RPC:', failRpc.error ? 'FAILED AS EXPECTED' : 'SUCCESS', failRpc.error?.message);

  // 8. Effective Date Hierarchy
  const dateRpc = await pmClient.rpc('c06_update_programme_atomic', { 
    p_programme_id: progA, 
    p_payload: { contract_start_date: '2000-01-01', contract_completion_date: '1999-01-01' }, 
    p_actor_id: pmAuth.user!.id, 
    p_audit_id: crypto.randomUUID() 
  });
  console.log('Date Hierarchy Check:', dateRpc.error ? 'DENIED AS EXPECTED' : 'ALLOWED', dateRpc.error?.code, dateRpc.error?.message);

}

main().catch(console.error);
