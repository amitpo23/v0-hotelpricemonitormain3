#!/usr/bin/env node
/**
 * Scan only missing dates from Q1 2026
 * Uses the resilient scraper logic but scans specific dates from missing-dates.txt
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load environment variables
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

const CHECKPOINT_FILE = '.missing-dates-checkpoint.json';
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

// Load missing dates
if (!existsSync('missing-dates.txt')) {
  console.error('❌ קובץ missing-dates.txt לא נמצא!');
  console.log('הרץ קודם: node find-missing-dates.mjs');
  process.exit(1);
}

const missingDates = readFileSync('missing-dates.txt', 'utf-8')
  .split('\n')
  .filter(d => d.trim())
  .sort();

console.log('🚀 מתחיל סריקת תאריכים חסרים\n');
console.log(`📅 סה"כ תאריכים לסריקה: ${missingDates.length}`);
console.log(`🏨 מלון: scarlet + 9 מתחרים\n`);

// Load checkpoint
let checkpoint = null;
if (existsSync(CHECKPOINT_FILE)) {
  checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
  console.log('📂 נמצא checkpoint קיים:');
  console.log(`   הושלמו: ${checkpoint.completed_dates.length} תאריכים`);
  console.log(`   נכשלו: ${checkpoint.failed_dates.length} תאריכים`);
  console.log(`   אחרון שהושלם: ${checkpoint.last_completed_date || 'אין'}\n`);
} else {
  checkpoint = {
    started_at: new Date().toISOString(),
    completed_dates: [],
    failed_dates: [],
    last_completed_date: null,
    stats: {
      total_prices: 0,
      successful_scans: 0,
      failed_scans: 0,
    }
  };
}

// Filter dates to scan (not completed yet)
const datesToScan = missingDates.filter(d => 
  !checkpoint.completed_dates.includes(d)
);

// Add failed dates for retry
const allDatesToScan = [...new Set([...checkpoint.failed_dates, ...datesToScan])].sort();

console.log(`📋 תאריכים לסריקה: ${allDatesToScan.length}`);
console.log(`   חדשים: ${datesToScan.length}`);
console.log(`   ניסיון חוזר: ${checkpoint.failed_dates.length}\n`);

// Save checkpoint function
function saveCheckpoint() {
  checkpoint.last_updated = new Date().toISOString();
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Scan a single date
async function scanDate(date) {
  try {
    console.log(`\n🔍 סורק ${date}...`);
    
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/scans/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_id: HOTEL_ID,
        start_date: date,
        days_to_scan: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.success) {
      console.log(`✅ הושלם: ${data.results_count || 0} מחירים`);
      return { success: true, prices: data.results_count || 0 };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ נכשל: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// Main scan loop
console.log('═══════════════════════════════════════════════════');
console.log('🏁 מתחיל סריקה...\n');

for (const date of allDatesToScan) {
  const result = await scanDate(date);

  if (result.success) {
    checkpoint.completed_dates.push(date);
    checkpoint.last_completed_date = date;
    checkpoint.stats.total_prices += result.prices;
    checkpoint.stats.successful_scans++;
    
    // Remove from failed if was there
    checkpoint.failed_dates = checkpoint.failed_dates.filter(d => d !== date);
  } else {
    checkpoint.stats.failed_scans++;
    if (!checkpoint.failed_dates.includes(date)) {
      checkpoint.failed_dates.push(date);
    }
  }

  // Save checkpoint after each date
  saveCheckpoint();

  // Progress
  const total = missingDates.length;
  const completed = checkpoint.completed_dates.length;
  const progress = ((completed / total) * 100).toFixed(1);
  
  console.log(`\n📊 התקדמות: ${completed}/${total} (${progress}%)`);
  console.log(`   מחירים: ${checkpoint.stats.total_prices}`);
  console.log(`   הצלחות/כשלונות: ${checkpoint.stats.successful_scans}/${checkpoint.stats.failed_scans}`);

  // Small delay between requests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Final summary
console.log('\n═══════════════════════════════════════════════════');
console.log('🎉 סריקה הושלמה!\n');
console.log('📊 סטטיסטיקות סופיות:');
console.log(`   תאריכים שהושלמו: ${checkpoint.completed_dates.length}/${missingDates.length}`);
console.log(`   מחירים שנאספו: ${checkpoint.stats.total_prices}`);
console.log(`   הצלחות: ${checkpoint.stats.successful_scans}`);
console.log(`   כשלונות: ${checkpoint.stats.failed_scans}`);

if (checkpoint.failed_dates.length > 0) {
  console.log(`\n⚠️  תאריכים שנכשלו (${checkpoint.failed_dates.length}):`);
  checkpoint.failed_dates.forEach(d => console.log(`     - ${d}`));
  console.log('\n💡 להריץ שוב רק על הנכשלים:');
  console.log('   node scan-missing-dates.mjs');
} else {
  console.log('\n✨ כל התאריכים הושלמו בהצלחה!');
  // Rename checkpoint
  if (existsSync(CHECKPOINT_FILE)) {
    writeFileSync(CHECKPOINT_FILE + '.completed', readFileSync(CHECKPOINT_FILE));
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log(`\n⏰ הסריקה האוטומטית הבאה תתבצע בעוד 72 שעות`);
console.log('   (כרון אוטומטי מוגדר ב-vercel.json)\n');
