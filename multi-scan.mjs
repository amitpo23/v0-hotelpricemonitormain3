#!/usr/bin/env node

/**
 * Multi-scan for Q1 2026 - runs multiple independent scans
 * Each scan covers 3 days, so we need ~30 scans for 90 days
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';
const DELAY_BETWEEN_SCANS = 2000; // 2 seconds

async function runScan(scanNum, totalScans) {
  console.log(`\n📊 Scan ${scanNum}/${totalScans}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id: HOTEL_ID })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`✅ Completed:`);
    console.log(`   Results: ${result.results_count || 0}`);
    console.log(`   Real scrapes: ${result.real_scrapes || 0}`);
    console.log(`   Days: ${result.summary?.days_scanned || 0}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Q1 2026 Multi-Scan');
  console.log('================================\n');
  console.log(`🏨 Hotel: ${HOTEL_ID}`);
  console.log(`📆 Each scan covers 3 days (current implementation)`);
  console.log(`🔄 Running 10 scans to get 30 days of data\n`);

  const totalScans = 10;
  let successCount = 0;
  let totalResults = 0;
  let totalRealScrapes = 0;

  for (let i = 1; i <= totalScans; i++) {
    const result = await runScan(i, totalScans);
    
    if (result && result.success) {
      successCount++;
      totalResults += result.results_count || 0;
      totalRealScrapes += result.real_scrapes || 0;
    }
    
    // Wait between scans to avoid overwhelming the system
    if (i < totalScans) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SCANS));
    }
  }

  console.log('\n\n================================');
  console.log('📊 FINAL SUMMARY');
  console.log('================================');
  console.log(`Successful scans: ${successCount}/${totalScans}`);
  console.log(`Total results: ${totalResults}`);
  console.log(`Total real scrapes: ${totalRealScrapes}`);
  console.log('================================\n');
}

main().catch(console.error);
