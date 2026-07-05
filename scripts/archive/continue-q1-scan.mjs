#!/usr/bin/env node

/**
 * Continue Q1 2026 scan from 2026-02-07
 * We have data until 2026-02-06, now scan the rest
 * Scan 5 days per batch, 11 batches to reach end of March
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';
const START_DATE = '2026-01-08';  // Continue from where we have real data (until 2026-01-07)
const DAYS_PER_BATCH = 1;  // 1 day per batch for faster completion
const BATCHES = 83;  // 83 batches x 1 day = 83 days (Jan 8 - Mar 31)
const TIMEOUT = 1800000; // 30 minutes per scan (increased from 15 to handle slow scrapes)
const MAX_RETRIES = 2;  // Retry failed scans up to 2 times

console.log('🔄 Continuing Q1 2026 Data Population');
console.log('====================================\n');
console.log(`📅 Start date: ${START_DATE}`);
console.log(`📊 Batches: ${BATCHES}`);
console.log(`📆 Days per batch: ${DAYS_PER_BATCH}`);
console.log(`⏱️  Timeout: ${TIMEOUT/1000/60} minutes per scan`);
console.log(`📅 Total days: ${BATCHES * DAYS_PER_BATCH}\n`);

let totalSaved = 0;
let totalReal = 0;
let successCount = 0;
let failCount = 0;

async function runScan(batchNum, retryCount = 0) {
  // Calculate the start date for this batch
  const batchStartDate = new Date(START_DATE);
  batchStartDate.setDate(batchStartDate.getDate() + (batchNum - 1) * DAYS_PER_BATCH);
  const dateStr = batchStartDate.toISOString().split('T')[0];
  
  const retryText = retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : '';
  console.log(`\n📊 Batch ${batchNum}/${BATCHES}${retryText}`);
  console.log(`📅 Date: ${dateStr}`);
  console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hotel_id: HOTEL_ID,
        start_date: dateStr,
        days_to_scan: DAYS_PER_BATCH
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (data.success) {
      const saved = data.results_count || 0;
      const real = data.real_scrapes || 0;
      
      totalSaved += saved;
      totalReal += real;
      successCount++;
      
      console.log(`✅ Success!`);
      console.log(`   Prices: ${saved} | Real scrapes: ${real}`);
      if (data.summary) {
        console.log(`   Min: ₪${data.summary.min_price || 0} | Max: ₪${data.summary.max_price || 0} | Avg: ₪${Math.round(data.summary.avg_price || 0)}`);
      }
      
      return true;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (e) {
    clearTimeout(timeoutId);
    
    const errorMsg = e.name === 'AbortError' ? `Timeout (>${TIMEOUT/1000/60} min)` : e.message;
    console.log(`❌ Failed: ${errorMsg}`);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying in 10 seconds...`);
      await new Promise(r => setTimeout(r, 10000));
      return await runScan(batchNum, retryCount + 1);
    } else {
      failCount++;
      console.log(`⚠️ Max retries reached, moving to next batch`);
      return false;
    }
  }
}

async function main() {
  const startTime = Date.now();
  
  for (let i = 1; i <= BATCHES; i++) {
    await runScan(i);
    
    // Progress summary every 10 batches
    if (i % 10 === 0) {
      console.log(`\n📈 Progress after ${i} batches:`);
      console.log(`   Total saved: ${totalSaved} prices`);
      console.log(`   Real scrapes: ${totalReal}`);
      console.log(`   Success: ${successCount} | Failed: ${failCount}`);
      console.log(`   Success rate: ${Math.round(successCount/i*100)}%`);
      console.log(`   Time elapsed: ${Math.round((Date.now()-startTime)/1000/60)} minutes\n`);
    }
    
    // Wait 10 seconds between batches
    if (i < BATCHES) {
      console.log(`⏳ Waiting 10s...`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  
  console.log('\n\n🎉 SCAN COMPLETE!');
  console.log('=================');
  console.log(`✅ Successfully scanned: ${successCount}/${BATCHES} batches`);
  console.log(`❌ Failed: ${failCount}/${BATCHES} batches`);
  console.log(`📊 Total prices saved: ${totalSaved}`);
  console.log(`🔍 Real scrapes performed: ${totalReal}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  console.log(`📅 Date range: ${START_DATE} to 2026-03-31`);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
