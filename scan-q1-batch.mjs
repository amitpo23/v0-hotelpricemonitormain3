#!/usr/bin/env node

/**
 * Batch scan for Q1 2026 - splits into weekly batches for better reliability
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const START_DATE = new Date('2026-01-01');
const END_DATE = new Date('2026-03-31');
const BATCH_SIZE = 7; // 7 days per batch
const API_URL = 'http://localhost:3001/api/scans/execute';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function scanBatch(startDate, endDate, batchNum, totalBatches) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  console.log(`\n📊 Batch ${batchNum}/${totalBatches}: ${start} to ${end}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId: HOTEL_ID,
        startDate: start,
        endDate: end,
        competitorIds: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Batch completed:`);
    console.log(`   Days scanned: ${result.daysScanned || 0}`);
    console.log(`   Prices saved: ${result.stats?.competitorPricesSaved || 0}`);
    console.log(`   Real scrapes: ${result.stats?.realScrapes || 0}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Batch failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Q1 2026 Batch Scan');
  console.log('================================\n');
  console.log(`📅 Period: ${formatDate(START_DATE)} to ${formatDate(END_DATE)}`);
  console.log(`🏨 Hotel: ${HOTEL_ID}`);
  console.log(`📦 Batch size: ${BATCH_SIZE} days\n`);

  const batches = [];
  let currentDate = new Date(START_DATE);
  
  // Generate batches
  while (currentDate < END_DATE) {
    const batchEnd = addDays(currentDate, BATCH_SIZE - 1);
    const actualEnd = batchEnd > END_DATE ? END_DATE : batchEnd;
    
    batches.push({
      start: new Date(currentDate),
      end: actualEnd
    });
    
    currentDate = addDays(currentDate, BATCH_SIZE);
  }

  console.log(`📋 Total batches: ${batches.length}\n`);
  console.log('Starting scans...\n');

  let successCount = 0;
  let totalPrices = 0;
  let totalScrapes = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await scanBatch(batch.start, batch.end, i + 1, batches.length);
    
    if (result) {
      successCount++;
      totalPrices += result.stats?.competitorPricesSaved || 0;
      totalScrapes += result.stats?.realScrapes || 0;
    }
    
    // Small delay between batches
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n================================');
  console.log('📊 Final Summary:');
  console.log(`✅ Successful batches: ${successCount}/${batches.length}`);
  console.log(`💾 Total prices saved: ${totalPrices}`);
  console.log(`🔍 Total real scrapes: ${totalScrapes}`);
  console.log('================================\n');
}

main().catch(console.error);
