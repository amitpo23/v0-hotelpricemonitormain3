import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔍 בודק טבלאות קיימות...\n');

const tables = [
  'competitor_daily_prices',
  'competitor_price_history',
  'daily_prices',
  'price_predictions',
  'monthly_forecasts',
  'hotel_competitors',
  'hotels',
  'scans'
];

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    console.log(`✅ ${table}: ${count} רשומות`);
  } else {
    console.log(`❌ ${table}: ${error.message}`);
  }
}

console.log('\n');
process.exit(0);
