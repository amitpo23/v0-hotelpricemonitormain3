import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
);

const SCAN_ID = '7a8ab759-59b8-4b54-97c6-22f1bd2fb032';

console.log(`\n📊 Checking scan ${SCAN_ID}...\n`);

// Check scan status
const { data: scan } = await supabase
  .from('scans')
  .select('*')
  .eq('id', SCAN_ID)
  .single();

console.log('Scan Status:', scan?.status);
console.log('Started:', scan?.started_at);
console.log('Completed:', scan?.completed_at);

// Check competitor_daily_prices (this is where the data was actually saved!)
const { data: dailyPrices, error } = await supabase
  .from('competitor_daily_prices')
  .select('*')
  .gte('scraped_at', scan?.started_at)
  .order('scraped_at', { ascending: false })
  .limit(30);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`\n✅ Found ${dailyPrices?.length || 0} prices saved in competitor_daily_prices:`);
  
  if (dailyPrices && dailyPrices.length > 0) {
    // Group by date
    const byDate = dailyPrices.reduce((acc, p) => {
      if (!acc[p.date]) acc[p.date] = [];
      acc[p.date].push(p);
      return acc;
    }, {});
    
    Object.entries(byDate).forEach(([date, prices]) => {
      console.log(`\n📅 ${date}: ${prices.length} prices`);
      prices.slice(0, 5).forEach(p => {
        console.log(`  - ₪${p.price} (${p.source})`);
      });
    });
  }
}

// Update scan to completed if still running
if (scan?.status === 'running') {
  console.log('\n🔄 Updating scan status to completed...');
  await supabase
    .from('scans')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', SCAN_ID);
  console.log('✅ Scan marked as completed');
}

console.log('\n📈 Summary:');
console.log(`- Scan ID: ${SCAN_ID}`);
console.log(`- Status: ${scan?.status}`);
console.log(`- Prices saved: ${dailyPrices?.length || 0}`);
console.log(`- Location: competitor_daily_prices table`);

process.exit(0);
