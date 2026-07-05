#!/usr/bin/env node

/**
 * Fill Q1 2026 with 18 batches of 5 days each = 90 days
 * Uses APIFY for real scraping
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';
const BATCH_SIZE = 18;  // 18 batches x 5 days = 90 days
const TIMEOUT = 600000; // 10 minutes per scan

console.log('🚀 Q1 2026 Full Data Population');
console.log('================================\n');
console.log(`📊 Batches: ${BATCH_SIZE}`);
console.log(`⏱️  Timeout: ${TIMEOUT/1000/60} minutes per scan`);
console.log(`📅 Total days: ~90 (API scans 3-5 days per call)\n`);

let totalSaved = 0;
let totalReal = 0;
let successCount = 0;
let failCount = 0;

async function runScan(batchNum) {
  console.log(`\n📊 Batch ${batchNum}/${BATCH_SIZE}`);
  console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({hotel_id: HOTEL_ID}),
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
  
  for (let i = 1; i <= BATCH_SIZE; i++) {
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
    if (i < BATCH_SIZE) {
      console.log(`⏳ Waiting 15s before next batch...`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  
  console.log('\n\n🎉 ═══════════════════════════════════════');
  console.log('    Q1 2026 DATA POPULATION COMPLETE!');
  console.log('═══════════════════════════════════════\n');
  console.log(`📊 Final Statistics:`);
  console.log(`   Total prices saved: ${totalSaved}`);
  console.log(`   Real scrapes: ${totalReal}`);
  console.log(`   Successful batches: ${successCount}/${BATCH_SIZE} (${Math.round(successCount/BATCH_SIZE*100)}%)`);
  console.log(`   Failed batches: ${failCount}`);
  console.log(`   Total time: ${totalTime} minutes (${Math.round(totalTime/60*10)/10} hours)`);
  console.log(`   Avg time per batch: ${Math.round(totalTime/BATCH_SIZE*10)/10} minutes`);
  
  if (totalReal > 0) {
    console.log(`\n✅ SUCCESS! You now have real competitor price data for predictions!`);
  } else {
    console.log(`\n⚠️  Warning: No real scrapes recorded. Check APIFY_API_KEY configuration.`);
  }
}

main().catch(console.error);
