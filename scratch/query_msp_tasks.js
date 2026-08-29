const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake' // this will fail if not actual, wait I can just use psql
  );
  // Actually, I can just use psql!
}
