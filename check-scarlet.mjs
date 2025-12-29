import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔍 בודק מלון סקרלט...\n');

// 1. מצא את המלון
const { data: hotels } = await supabase
  .from('hotels')
  .select('*')
  .ilike('name', '%scarlet%');

if (!hotels || hotels.length === 0) {
  const { data: allHotels } = await supabase.from('hotels').select('id, name');
  console.log('❌ לא נמצא מלון סקרלט');
  console.log('מלונות קיימים:', allHotels?.map(h => h.name).join(', '));
  process.exit(1);
}

const scarlet = hotels[0];
console.log('✅ מלון נמצא:', scarlet.name);
console.log('   ID:', scarlet.id);
console.log('   Base Price:', scarlet.base_price);
console.log('   Total Rooms:', scarlet.total_rooms);

// 2. בדוק אם יש מחירים של המלון עצמו
const { data: ourPrices, count: ourCount } = await supabase
  .from('daily_prices')
  .select('*', { count: 'exact' })
  .eq('hotel_id', scarlet.id);

console.log('\n📊 daily_prices (המחירים שלנו):', ourCount || 0);

// 3. בדוק מתחרים
const { data: competitors, count: compCount } = await supabase
  .from('hotel_competitors')
  .select('*', { count: 'exact' })
  .eq('hotel_id', scarlet.id)
  .eq('is_active', true);

console.log('🏨 מתחרים פעילים:', compCount || 0);
if (competitors && competitors.length > 0) {
  competitors.forEach(c => {
    console.log('   -', c.competitor_hotel_name, '| URL:', c.booking_url ? '✅' : '❌');
  });
}

// 4. בדוק מחירי מתחרים
const { count: competitorPricesCount } = await supabase
  .from('competitor_daily_prices')
  .select('*', { count: 'exact', head: true })
  .eq('hotel_id', scarlet.id);

console.log('\n💰 competitor_daily_prices:', competitorPricesCount || 0);

process.exit(0);
