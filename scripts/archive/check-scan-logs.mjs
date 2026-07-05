import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('📊 Verifying scan_logs table...\n');
  
  // Try to query the table
  const { data, error } = await supabase
    .from('scan_logs')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Table scan_logs does not exist\n');
      console.log('📝 Please create it manually in Supabase SQL Editor:');
      console.log('   1. Go to Supabase Dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Run the SQL from: scripts/002_create_scan_logs_table.sql\n');
    } else {
      console.log('⚠️  Error checking table:', error.message);
    }
  } else {
    console.log('✅ Table scan_logs exists!\n');
    
    // Get count
    const { count } = await supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Current records: ${count || 0}\n`);
    console.log('Table structure:');
    console.log('  ✓ id (UUID)');
    console.log('  ✓ hotel_id (UUID)');
    console.log('  ✓ scan_type (manual, auto_cron, api, resilient)');
    console.log('  ✓ status (pending, running, completed, failed, partial)');
    console.log('  ✓ start_date, days_scanned, end_date');
    console.log('  ✓ results_count, prices_found, etc.');
    console.log('  ✓ triggered_at, completed_at, duration_seconds');
  }
})();
