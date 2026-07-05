import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
);

console.log('🧹 Cleaning up stuck scans...\n');

// Update all "running" scans to "failed" if they've been running for more than 10 minutes
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

const { data: stuckScans, error: findError } = await supabase
  .from('scans')
  .select('*')
  .eq('status', 'running')
  .lt('started_at', tenMinutesAgo);

if (findError) {
  console.error('Error finding stuck scans:', findError);
  process.exit(1);
}

console.log(`Found ${stuckScans?.length || 0} stuck scans`);

if (stuckScans && stuckScans.length > 0) {
  const { error: updateError } = await supabase
    .from('scans')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: 'Scan timed out or stuck in running state'
    })
    .eq('status', 'running')
    .lt('started_at', tenMinutesAgo);

  if (updateError) {
    console.error('Error updating stuck scans:', updateError);
  } else {
    console.log(`✅ Updated ${stuckScans.length} stuck scans to failed`);
  }
}

// Show summary
const { data: summary } = await supabase
  .from('scans')
  .select('status');

const counts = summary?.reduce((acc, scan) => {
  acc[scan.status] = (acc[scan.status] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Scan Status Summary:');
console.log(counts);

process.exit(0);
