#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const COMPETITOR_ID = '9f0788ca-ed07-47ae-845f-8aca46d50c44'; // coco hotel
const DATE = '2026-01-10';

console.log('🔍 בודק תוצאות עבור coco hotel ב-2026-01-10\n');

const { data, error } = await supabase
  .from('competitor_daily_prices')
  .select('date, price, currency, source, room_type, scraped_at')
  .eq('hotel_id', HOTEL_ID)
  .eq('competitor_id', COMPETITOR_ID)
  .eq('date', DATE)
  .order('scraped_at', { ascending: false });

if (error) {
  console.log('❌ שגיאה:', error.message);
  process.exit(1);
}

console.log(`📊 נמצאו ${data.length} רשומות:\n`);

data.forEach((row, i) => {
  console.log(`${i+1}. חדר: ${row.room_type}`);
  console.log(`   מחיר: ${row.price} ${row.currency}`);
  console.log(`   מקור: ${row.source}`);
  console.log(`   נשמר: ${new Date(row.scraped_at).toLocaleString('he-IL')}`);
  console.log('');
});

// בדיקה אם יש מחירים מדומים
const simulated = data.filter(r => r.source === 'simulated');
const bookingCom = data.filter(r => r.source === 'Booking.com');

console.log('\n📈 סיכום:');
console.log(`✅ Booking.com אמיתי: ${bookingCom.length} רשומות`);
if (simulated.length > 0) {
  console.log(`❌ מדומה (simulated): ${simulated.length} רשומות - זה לא טוב!`);
} else {
  console.log(`✅ אין נתונים מדומים - מעולה!`);
}

// בדיקת מטבע
const currencies = [...new Set(data.map(r => r.currency))];
console.log(`\n💱 מטבעות: ${currencies.join(', ')}`);
