import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
);

console.log('📊 Checking for saved scan data...\n');

// Check completed scans
const { data: completedScans, error: scansError } = await supabase
  .from('scans')
  .select('*')
  .eq('status', 'completed')
  .order('started_at', { ascending: false })
  .limit(5);

if (scansError) {
  console.error('Error:', scansError);
} else {
  console.log(`✅ Found ${completedScans?.length || 0} completed scans`);
  if (completedScans && completedScans.length > 0) {
    completedScans.forEach(scan => {
      console.log(`  - Scan ${scan.id}: Started ${scan.started_at}, Completed ${scan.completed_at}`);
    });
  }
}

// Check scan results
const { data: results, error: resultsError } = await supabase
  .from('scan_results')
  .select('*')
  .order('scraped_at', { ascending: false })
  .limit(10);

if (resultsError) {
  console.error('Scan Results Error:', resultsError);
} else {
  console.log(`\n📈 Found ${results?.length || 0} scan results`);
  if (results && results.length > 0) {
    results.forEach(result => {
      console.log(`  - ${result.source}: ₪${result.price} (${result.room_type}) - ${result.scraped_at}`);
    });
  }
}

// Check competitor daily prices
const { data: dailyPrices, error: dailyError } = await supabase
  .from('competitor_daily_prices')
  .select('*')
  .order('scraped_at', { ascending: false })
  .limit(10);

if (dailyError) {
  console.error('Daily Prices Error:', dailyError);
} else {
  console.log(`\n💰 Found ${dailyPrices?.length || 0} competitor daily prices`);
  if (dailyPrices && dailyPrices.length > 0) {
    dailyPrices.forEach(price => {
      console.log(`  - Date: ${price.date}, Price: ₪${price.price}, Source: ${price.source} - ${price.scraped_at}`);
    });
  }
}

// Check hotels
const { data: hotels } = await supabase
  .from('hotels')
  .select('id, name, location')
  .limit(5);

console.log(`\n🏨 Found ${hotels?.length || 0} hotels`);
if (hotels && hotels.length > 0) {
  hotels.forEach(hotel => {
    console.log(`  - ${hotel.name} (${hotel.location})`);
  });
}

// Check competitors
const { data: competitors } = await supabase
  .from('hotel_competitors')
  .select('competitor_hotel_name, is_active')
  .limit(10);

console.log(`\n🏢 Found ${competitors?.length || 0} competitors`);
if (competitors && competitors.length > 0) {
  const active = competitors.filter(c => c.is_active).length;
  console.log(`  - ${active} active competitors`);
  console.log(`  - ${competitors.length - active} inactive competitors`);
}

process.exit(0);
