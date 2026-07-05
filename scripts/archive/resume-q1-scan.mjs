#!/usr/bin/env node

/**
 * Resume Q1 2026 scan from where we left off
 * Start from 2026-01-08 (we have data until 2026-01-07)
 * Scan 5 days per batch, 17 batches to cover 85 days
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';
const START_DATE = '2026-01-08';  // Continue from where we stopped
const DAYS_PER_BATCH = 5;
const BATCHES = 17;  // 17 batches x 5 days = 85 days (Jan 8 - Mar 31)
const TIMEOUT = 900000; // 15 minutes per scan (increased from 10)

console.log('🔄 Resuming Q1 2026 Data Population');
console.log('===================================\n');
console.log(`📅 Start date: ${START_DATE}`);
console.log(`📊 Batches: ${BATCHES}`);
console.log(`📆 Days per batch: ${DAYS_PER_BATCH}`);
console.log(`⏱️  Timeout: ${TIMEOUT/1000/60} minutes per scan`);
console.log(`📅 Total days: ${BATCHES * DAYS_PER_BATCH}\n`);

let totalSaved = 0;
let totalReal = 0;
let successCount = 0;
let failCount = 0;

async function runScan(batchNum) {
  // Calculate the start date for this batch
  const batchStartDate = new Date(START_DATE);
  batchStartDate.setDate(batchStartDate.getDate() + (batchNum - 1) * DAYS_PER_BATCH);
  const dateStr = batchStartDate.toISOString().split('T')[0];
  
  console.log(`\n📊 Batch ${batchNum}/${BATCHES}`);
  console.log(`📅 Starting from: ${dateStr}`);
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
      console.log(`   Prices: ${saved} | Real scrapes: ${real} | Days: ${data.summary?.days_scanned || '?'}`);
      console.log(`   Min: ₪${data.summary?.min_price || '?'} | Max: ₪${data.summary?.max_price || '?'} | Avg: ₪${Math.round(data.summary?.avg_price || 0)}`);
      
      return true;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (e) {
    clearTimeout(timeoutId);
    failCount++;
    
    if (e.name === 'AbortError') {
      console.log(`❌ Timeout (>${TIMEOUT/1000}s)`);
    } else {
      console.log(`❌ Failed: ${e.message}`);
    }
    
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  for (let i = 1; i <= BATCHES; i++) {
    await runScan(i);
    
    // Progress summary every 5 batches
    if (i % 5 === 0) {
      console.log(`\n📈 Progress after ${i} batches:`);
      console.log(`   Total saved: ${totalSaved} prices`);
      console.log(`   Real scrapes: ${totalReal}`);
      console.log(`   Success rate: ${successCount}/${i} (${Math.round(successCount/i*100)}%)`);
      console.log(`   Time elapsed: ${Math.round((Date.now()-startTime)/1000/60)} minutes\n`);
    }
    
    // Wait 15 seconds between batches to avoid overwhelming the system
    if (i < BATCHES) {
      console.log(`⏳ Waiting 15s before next batch...`);
      await new Promise(r => setTimeout(r, 15000));
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
