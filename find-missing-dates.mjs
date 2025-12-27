import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

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

console.log('🔍 מחפש תאריכים חסרים ב-Q1 2026...\n');

// Get all dates in Q1 2026
const { data: prices, error } = await supabase
  .from('competitor_daily_prices')
  .select('date')
  .gte('date', '2026-01-01')
  .lte('date', '2026-03-31');

if (error) {
  console.error('❌ שגיאה:', error.message);
  process.exit(1);
}

// Get unique dates we have
const existingDates = [...new Set(prices.map(p => p.date))].sort();
console.log(`✅ תאריכים קיימים: ${existingDates.length}/90\n`);

// Generate all Q1 2026 dates
const allDates = [];
const start = new Date('2026-01-01');
for (let i = 0; i < 90; i++) {
  const date = new Date(start);
  date.setDate(date.getDate() + i);
  allDates.push(date.toISOString().split('T')[0]);
}

// Find missing dates
const missingDates = allDates.filter(d => !existingDates.includes(d));

console.log(`❌ תאריכים חסרים: ${missingDates.length}/90\n`);

if (missingDates.length === 0) {
  console.log('🎉 אין תאריכים חסרים! Q1 2026 מלא!');
  process.exit(0);
}

console.log('📋 תאריכים חסרים:');
missingDates.forEach(d => console.log(`  ⏳ ${d}`));

// Save to file for the scraper
writeFileSync('missing-dates.txt', missingDates.join('\n'));
console.log('\n💾 נשמר ל: missing-dates.txt');

console.log(`\n🚀 להרצת הסריקה על התאריכים החסרים:`);
console.log(`   node scan-missing-dates.mjs`);
