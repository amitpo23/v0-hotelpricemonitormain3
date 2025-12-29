#!/usr/bin/env node

/**
 * סריקת חודש פברואר 2026 - 28 ימים
 * מריץ סריקה מלאה למלון ולכל המתחרים המוגדרים
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3001/api/scans/execute'; // פורט 3001


// פברואר 2026 - 28 ימים
const FEBRUARY_START = '2026-02-01';
const TOTAL_DAYS = 28;

// נסרוק בבאצ'ים של 3 ימים (מהיר ויציב יותר)
const DAYS_PER_BATCH = 3;
const TOTAL_BATCHES = Math.ceil(TOTAL_DAYS / DAYS_PER_BATCH); // 10 באצ'ים

async function scanFebruary2026() {
  console.log('🗓️  סריקת חודש פברואר 2026');
  console.log('================================\n');
  console.log(`📅 תאריכים: ${FEBRUARY_START} - 2026-02-28`);
  console.log(`📊 סה"כ ימים: ${TOTAL_DAYS}`);
  console.log(`📦 באצ'ים: ${TOTAL_BATCHES} (${DAYS_PER_BATCH} ימים כל אחד)`);
  console.log(`🏨 מזהה מלון: ${HOTEL_ID}\n`);
  
  let totalSaved = 0;
  let totalReal = 0;
  let successfulBatches = 0;
  let failedBatches = 0;
  let totalDaysScanned = 0;
  
  const startTime = Date.now();
  
  for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
    const batchStartDay = (batch - 1) * DAYS_PER_BATCH + 1;
    const batchDays = Math.min(DAYS_PER_BATCH, TOTAL_DAYS - (batch - 1) * DAYS_PER_BATCH);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 באצ' ${batch}/${TOTAL_BATCHES} - ימים ${batchStartDay}-${batchStartDay + batchDays - 1} בפברואר`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const startDate = new Date(FEBRUARY_START);
      startDate.setDate(batchStartDay);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      console.log(`📅 תאריך התחלה: ${startDateStr}`);
      console.log(`📊 ימים לסריקה: ${batchDays}`);
      console.log(`⏳ שולח בקשה (עשוי לקחת 5-10 דקות)...\n`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200000); // 20 דקות timeout
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hotel_id: HOTEL_ID,
          start_date: startDateStr,
          days_to_scan: batchDays
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        successfulBatches++;
        const saved = result.results_count || 0;
        const real = result.real_scrapes || 0;
        const daysScanned = result.summary?.days_scanned || batchDays;
        
        totalSaved += saved;
        totalReal += real;
        totalDaysScanned += daysScanned;
        
        console.log(`✅ באצ' ${batch} הושלם בהצלחה:`);
        console.log(`   💾 מחירים שנשמרו: ${saved}`);
        console.log(`   🔥 סריקות אמיתיות: ${real}`);
        console.log(`   📅 ימים שנסרקו: ${daysScanned}`);
        
        if (result.summary) {
          console.log(`   💰 מחיר מינימלי: ₪${result.summary.min_price || 'N/A'}`);
          console.log(`   💰 מחיר מקסימלי: ₪${result.summary.max_price || 'N/A'}`);
          console.log(`   📊 ממוצע: ₪${result.summary.avg_price || 'N/A'}`);
        }
      } else {
        throw new Error(result.error || 'שגיאה לא ידועה');
      }
      
    } catch (error) {
      failedBatches++;
      console.error(`❌ באצ' ${batch} נכשל: ${error.message}`);
      
      // נמשיך לבאצ' הבא גם אם נכשל
      console.log(`⏭️  ממשיך לבאצ' הבא...\n`);
    }
    
    // התקדמות כוללת
    const progress = Math.round((batch / TOTAL_BATCHES) * 100);
    console.log(`\n📈 התקדמות כוללת: ${progress}% (${batch}/${TOTAL_BATCHES} באצ'ים)`);
    
    // סטטיסטיקות ביניים כל 2 באצ'ים
    if (batch % 2 === 0 || batch === TOTAL_BATCHES) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const avgPerBatch = elapsed / batch;
      const remaining = Math.round(avgPerBatch * (TOTAL_BATCHES - batch) / 60);
      
      console.log(`\n📊 סטטיסטיקות ביניים:`);
      console.log(`   ✅ באצ'ים שהושלמו: ${successfulBatches}/${batch}`);
      console.log(`   ❌ באצ'ים שנכשלו: ${failedBatches}`);
      console.log(`   💾 סה"כ מחירים: ${totalSaved}`);
      console.log(`   🔥 סה"כ סריקות: ${totalReal}`);
      console.log(`   📅 ימים שנסרקו: ${totalDaysScanned}/${TOTAL_DAYS}`);
      console.log(`   ⏱️  זמן שעבר: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`);
      if (batch < TOTAL_BATCHES) {
        console.log(`   ⏳ זמן משוער שנותר: ~${remaining} דקות`);
      }
    }
    
    // המתנה קצרה בין באצ'ים
    if (batch < TOTAL_BATCHES) {
      console.log(`\n⏸️  המתנה 3 שניות לפני הבאצ' הבא...\n`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`🎉 סריקת פברואר 2026 הושלמה!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 סיכום:`);
  console.log(`   ✅ באצ'ים מוצלחים: ${successfulBatches}/${TOTAL_BATCHES}`);
  console.log(`   ❌ באצ'ים שנכשלו: ${failedBatches}`);
  console.log(`   💾 סה"כ מחירים שנשמרו: ${totalSaved}`);
  console.log(`   🔥 סה"כ סריקות אמיתיות: ${totalReal}`);
  console.log(`   📅 ימים שנסרקו: ${totalDaysScanned}/${TOTAL_DAYS}`);
  console.log(`   ⏱️  זמן כולל: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  
  if (totalSaved > 0) {
    console.log(`   📈 ממוצע מחירים לבאצ': ${Math.round(totalSaved / successfulBatches)}`);
    console.log(`   🔥 ממוצע סריקות לבאצ': ${Math.round(totalReal / successfulBatches)}`);
  }
  
  const successRate = Math.round((successfulBatches / TOTAL_BATCHES) * 100);
  console.log(`\n   🎯 אחוז הצלחה: ${successRate}%`);
  
  if (successRate === 100) {
    console.log(`\n   ✨ מושלם! כל הסריקות הצליחו!\n`);
  } else if (successRate >= 80) {
    console.log(`\n   👍 טוב! רוב הסריקות הצליחו\n`);
  } else {
    console.log(`\n   ⚠️  חלק מהסריקות נכשלו - בדוק לוגים\n`);
  }
  
  console.log(`💡 שלבים הבאים:`);
  console.log(`   1. בדוק נתונים: http://localhost:3000/scans`);
  console.log(`   2. צפה בחיזויים: http://localhost:3000/predictions`);
  console.log(`   3. נתח תחרות: http://localhost:3000/analytics\n`);
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🏨 מערכת ניטור מחירי מלונות                       ║
║         📅 סריקת חודש פברואר 2026                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

scanFebruary2026().catch(error => {
  console.error('\n❌ שגיאה חמורה:', error);
  process.exit(1);
});
