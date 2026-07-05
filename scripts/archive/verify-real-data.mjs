#!/usr/bin/env node

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const DATE = '2026-01-15';

console.log('🔍 בודק מחירים שנשמרו ב-2026-01-15\n');

const url = `http://localhost:3002/api/competitors/prices?hotel_id=${HOTEL_ID}&date=${DATE}`;

try {
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.success) {
    console.log('❌ שגיאה:', data.error);
    process.exit(1);
  }
  
  console.log(`📊 נמצאו ${data.prices.length} מלונות מתחרים:\n`);
  
  data.prices.forEach((competitor, i) => {
    console.log(`${i+1}. ${competitor.competitor_name}`);
    if (competitor.price_data && competitor.price_data.length > 0) {
      competitor.price_data.forEach(room => {
        console.log(`   • חדר: ${room.room_type}`);
        console.log(`   • מחיר: ${room.price} ${room.currency}`);
        console.log(`   • מקור: ${room.source}`);
        console.log(`   • נשמר: ${new Date(room.scraped_at).toLocaleString('he-IL')}`);
        
        if (room.source === 'simulated') {
          console.log('   ⚠️  זה מחיר מדומה - לא טוב!');
        } else {
          console.log('   ✅ מקור אמיתי');
        }
      });
    } else {
      console.log('   ❌ אין מחירים');
    }
    console.log('');
  });
  
  // סיכום
  const allRooms = data.prices.flatMap(p => p.price_data || []);
  const simulated = allRooms.filter(r => r.source === 'simulated');
  const real = allRooms.filter(r => r.source === 'Booking.com');
  
  console.log('\n📈 סיכום:');
  console.log(`✅ Booking.com אמיתי: ${real.length} רשומות`);
  console.log(`❌ מדומה (simulated): ${simulated.length} רשומות`);
  
  if (simulated.length === 0) {
    console.log('\n🎉 מעולה! כל המחירים אמיתיים מ-Booking.com!');
  } else {
    console.log('\n⚠️  יש עדיין מחירים מדומים - צריך לתקן!');
  }
  
  // בדיקת מטבע
  const currencies = [...new Set(allRooms.map(r => r.currency))];
  console.log(`\n💱 מטבעות שזוהו: ${currencies.join(', ')}`);
  
} catch (error) {
  console.log('❌ שגיאה:', error.message);
  process.exit(1);
}
