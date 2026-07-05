import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
);

const { data: scans, error } = await supabase
  .from('scans')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('Error:', error);
} else {
  console.log('\n=== Recent Scans ===\n');
  scans.forEach(scan => {
    console.log('-----------------------------------');
    console.log('ID:', scan.id);
    console.log('Status:', scan.status);
    console.log('Created:', scan.created_at);
    console.log('Started:', scan.started_at);
    console.log('Completed:', scan.completed_at);
    console.log('Total Competitors:', scan.total_competitors);
    console.log('Completed Count:', scan.completed_count);
    console.log('Failed Count:', scan.failed_count);
    if (scan.error_message) console.log('Error:', scan.error_message);
  });
}

// Check scan results for the latest scan
if (scans && scans.length > 0) {
  const latestScan = scans[0];
  console.log('\n\n=== Latest Scan Results ===\n');
  
  const { data: results, error: resultsError } = await supabase
    .from('scan_results')
    .select('*')
    .eq('scan_id', latestScan.id)
    .order('scraped_at', { ascending: false })
    .limit(10);

  if (resultsError) {
    console.error('Results Error:', resultsError);
  } else {
    console.log(`Found ${results.length} results for scan ${latestScan.id}`);
    results.forEach(result => {
      console.log('---');
      console.log('Competitor ID:', result.competitor_id);
      console.log('Status:', result.status);
      console.log('Price:', result.price);
      console.log('Scraped At:', result.scraped_at);
      if (result.error_message) console.log('Error:', result.error_message);
    });
  }
}

process.exit(0);
