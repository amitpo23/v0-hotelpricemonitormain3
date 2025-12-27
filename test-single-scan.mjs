#!/usr/bin/env node

// סריקת מלון אחד ולילה אחד - בדיקת תקינות
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const COMPETITOR_ID = '555c42d5-a988-4873-b668-5e4416600284'; // Debrah Brown
const DATE = '2026-02-15'; // תאריך חדש שבטוח לא נסרק

console.log('🔍 בדיקת תקינות: סריקת מלון אחד ללילה אחד');
console.log('🏨 מלון: Debrah Brown');
console.log('📅 תאריך: 2026-02-15');
console.log('');

const response = await fetch('http://localhost:3002/api/scans/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hotel_id: HOTEL_ID,
    competitor_id: COMPETITOR_ID,
    start_date: DATE,
    days_to_scan: 1
  })
});

const result = await response.json();

if (!result.success) {
  console.log('❌ הסריקה נכשלה:', result.error);
  process.exit(1);
}

console.log('✅ הסריקה הצליחה!\n');
console.log('📊 תוצאות:');
console.log(`   • מחירים שנמצאו: ${result.results_count}`);
console.log(`   • מחיר מינימלי: ${result.summary.min_price}`);
console.log(`   • מחיר מקסימלי: ${result.summary.max_price}`);
console.log(`   • מחיר ממוצע: ${result.summary.avg_price.toFixed(2)}`);

console.log('\n🔎 בודק בבסיס הנתונים...\n');

// Wait a second for data to be saved
await new Promise(resolve => setTimeout(resolve, 2000));

// Check what was saved
const checkResponse = await fetch(`http://localhost:3002/api/analytics/competitor-prices?hotel_id=${HOTEL_ID}&date=${DATE}`);
const checkResult = await checkResponse.json();

if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
  const debrahData = checkResult.data.find(c => c.competitor_id === COMPETITOR_ID);
  
  if (debrahData && debrahData.prices && debrahData.prices.length > 0) {
    console.log('💾 מה שנשמר בבסיס הנתונים:');
    debrahData.prices.forEach((price, i) => {
      console.log(`\n${i + 1}. ${price.room_type || 'Standard Room'}`);
      console.log(`   💰 מחיר: ${price.price} ${price.currency}`);
      console.log(`   📍 מקור: ${price.source}`);
      console.log(`   ⏰ נשמר: ${new Date(price.scraped_at).toLocaleString('he-IL')}`);
      
      if (price.source === 'Booking.com') {
        console.log('   ✅ מקור אמיתי!');
      } else if (price.source === 'simulated') {
        console.log('   ❌ מקור מדומה - זה לא טוב!');
      }
    });
    
    const allReal = debrahData.prices.every(p => p.source === 'Booking.com');
    const currencies = [...new Set(debrahData.prices.map(p => p.currency))];
    
    console.log('\n' + '='.repeat(50));
    if (allReal) {
      console.log('🎉 הצלחה! כל המחירים אמיתיים מ-Booking.com!');
    } else {
      console.log('⚠️  יש מחירים מדומים - צריך לתקן את הקוד!');
    }
    console.log(`💱 מטבעות: ${currencies.join(', ')}`);
    console.log('='.repeat(50));
  } else {
    console.log('⚠️  לא נמצאו נתונים עבור Debrah Brown');
  }
} else {
  console.log('⚠️  לא הצליח לקרוא מבסיס הנתונים');
}
