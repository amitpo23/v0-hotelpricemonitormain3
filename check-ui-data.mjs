import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
);

console.log('🔍 Checking what data the UI should display...\n');

// Check scan_configs (for the configurations section)
const { data: scanConfigs } = await supabase
  .from("scan_configs")
  .select(`*, hotels (name, base_price, location)`)
  .order("created_at", { ascending: false });

console.log(`📋 Scan Configs: ${scanConfigs?.length || 0} found`);
if (scanConfigs && scanConfigs.length > 0) {
  const active = scanConfigs.filter(c => c.is_active).length;
  console.log(`  - ${active} active configs`);
  console.log(`  - ${scanConfigs.length - active} inactive configs`);
}

// Check recent scans (for the scans history section)
const { data: recentScans } = await supabase
  .from("scans")
  .select(`*`)
  .order("started_at", { ascending: false })
  .limit(20);

console.log(`\n📊 Recent Scans: ${recentScans?.length || 0} found`);
if (recentScans && recentScans.length > 0) {
  const completed = recentScans.filter(s => s.status === "completed").length;
  const failed = recentScans.filter(s => s.status === "failed").length;
  const running = recentScans.filter(s => s.status === "running").length;
  
  console.log(`  - ✅ ${completed} completed`);
  console.log(`  - ❌ ${failed} failed`);
  console.log(`  - 🔄 ${running} running`);
  
  console.log('\n  Latest 5 scans:');
  recentScans.slice(0, 5).forEach(scan => {
    const duration = scan.completed_at 
      ? ((new Date(scan.completed_at) - new Date(scan.started_at)) / 1000).toFixed(1)
      : 'N/A';
    console.log(`    ${scan.status.padEnd(10)} | ${scan.started_at} | ${duration}s`);
  });
}

// Check scan results
const { data: recentResults } = await supabase
  .from("scan_results")
  .select("*")
  .order("scraped_at", { ascending: false })
  .limit(20);

console.log(`\n💰 Scan Results: ${recentResults?.length || 0} found`);
if (recentResults && recentResults.length > 0) {
  const avgPrice = recentResults.reduce((sum, r) => sum + Number(r.price), 0) / recentResults.length;
  console.log(`  - Average price: ₪${avgPrice.toFixed(2)}`);
  console.log(`  - Price range: ₪${Math.min(...recentResults.map(r => r.price))} - ₪${Math.max(...recentResults.map(r => r.price))}`);
}

// Check competitor daily prices (alternative source)
const { data: dailyPrices } = await supabase
  .from("competitor_daily_prices")
  .select("*")
  .order("scraped_at", { ascending: false })
  .limit(20);

console.log(`\n📈 Competitor Daily Prices: ${dailyPrices?.length || 0} found`);
if (dailyPrices && dailyPrices.length > 0) {
  const avgPrice = dailyPrices.reduce((sum, r) => sum + Number(r.price), 0) / dailyPrices.length;
  console.log(`  - Average price: ₪${avgPrice.toFixed(2)}`);
  console.log(`  - Price range: ₪${Math.min(...dailyPrices.map(r => r.price))} - ₪${Math.max(...dailyPrices.map(r => r.price))}`);
  
  const latest = dailyPrices.slice(0, 5);
  console.log('\n  Latest 5 prices:');
  latest.forEach(p => {
    console.log(`    ${p.date} | ₪${p.price} | ${p.source || 'N/A'}`);
  });
}

console.log('\n✅ Summary:');
console.log(`- Scan configs exist: ${(scanConfigs?.length || 0) > 0 ? 'YES' : 'NO'}`);
console.log(`- Scans exist: ${(recentScans?.length || 0) > 0 ? 'YES' : 'NO'}`);
console.log(`- Scan results exist: ${(recentResults?.length || 0) > 0 ? 'YES' : 'NO'}`);
console.log(`- Daily prices exist: ${(dailyPrices?.length || 0) > 0 ? 'YES' : 'NO'}`);

console.log('\n📌 UI Status:');
if ((recentScans?.length || 0) > 0) {
  console.log('✅ The UI SHOULD display the scans in the history section');
  console.log(`✅ ${recentScans.filter(s => s.status === "completed").length} completed scans should be visible`);
} else {
  console.log('⚠️  No scans to display');
}

process.exit(0);
