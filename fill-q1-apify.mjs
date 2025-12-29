#!/usr/bin/env node

/**
 * Q1 2026 Data Fill using APIFY - 18 batches of 5 days each
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';
const DAYS_PER_BATCH = 5;
const TOTAL_BATCHES = 18; // 18 x 5 = 90 days

async function runScan() {
  console.log('🚀 Q1 2026 Data Fill with APIFY');
  console.log('================================\n');
  console.log(`📊 Total batches: ${TOTAL_BATCHES}`);
  console.log(`📅 Days per batch: ${DAYS_PER_BATCH}`);
  console.log(`📈 Total days: ${TOTAL_BATCHES * DAYS_PER_BATCH}\n`);
  
  let totalSaved = 0;
  let totalReal = 0;
  let successfulBatches = 0;
  let failedBatches = 0;
  
  for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 Batch ${batch}/${TOTAL_BATCHES}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      console.log(`   Sending request (may take 5-10 minutes)...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel_id: HOTEL_ID }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        successfulBatches++;
        const saved = result.results_count || 0;
        const real = result.real_scrapes || 0;
        totalSaved += saved;
        totalReal += real;
        
        console.log(`✅ Batch ${batch} completed:`);
        console.log(`   Prices saved: ${saved}`);
        console.log(`   Real scrapes: ${real}`);
        console.log(`   Days scanned: ${result.summary?.days_scanned || 'N/A'}`);
        console.log(`   Min price: ₪${result.summary?.min_price || 'N/A'}`);
        console.log(`   Max price: ₪${result.summary?.max_price || 'N/A'}`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      failedBatches++;
      console.error(`❌ Batch ${batch} failed: ${error.message}`);
    }
    
    // Progress summary every 5 batches
    if (batch % 5 === 0) {
      console.log(`\n📊 Progress Update:`);
      console.log(`   Batches completed: ${successfulBatches}/${batch}`);
      console.log(`   Total prices saved: ${totalSaved}`);
      console.log(`   Total real scrapes: ${totalReal}`);
      console.log(`   Failed batches: ${failedBatches}`);
    }
    
    // Wait 5 seconds between batches to avoid overwhelming the system
    if (batch < TOTAL_BATCHES) {
      console.log(`\n⏳ Waiting 5 seconds before next batch...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`🎉 COMPLETED!`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Successful batches: ${successfulBatches}/${TOTAL_BATCHES}`);
  console.log(`❌ Failed batches: ${failedBatches}`);
  console.log(`📊 Total prices saved: ${totalSaved}`);
  console.log(`🔥 Total real scrapes: ${totalReal}`);
  console.log(`📈 Average per batch: ${(totalSaved / successfulBatches).toFixed(1)}`);
  console.log(`\n💡 Next step: Check predictions at http://localhost:3000/predictions`);
}

runScan().catch(console.error);
