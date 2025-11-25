#!/usr/bin/env node

/**
 * Automated Scan Test
 * This script triggers a scan and verifies results are collected
 */

import { executeScan } from './server/services/scanService.js';
import * as db from './server/db.js';

console.log('🧪 Starting Automated Scan Test...\n');

async function runTest() {
  try {
    // Get first scan config
    console.log('📋 Step 1: Finding scan configuration...');
    const configs = await db.getScanConfigs(1); // Get configs for user 1
    
    if (configs.length === 0) {
      console.error('❌ No scan configurations found');
      process.exit(1);
    }
    
    const config = configs[0];
    console.log(`✅ Found config: "${config.name}" (ID: ${config.id})\n`);
    
    // Execute scan
    console.log('🚀 Step 2: Starting scan...');
    const progress = await executeScan(config.id);
    console.log(`✅ Scan started with ID: ${progress.scanId}\n`);
    
    // Wait for scan to complete (poll every 5 seconds)
    console.log('⏳ Step 3: Waiting for scan to complete...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      
      const scanRecord = await db.getScanById(progress.scanId);
      
      if (!scanRecord) {
        console.error('❌ Scan record not found');
        process.exit(1);
      }
      
      console.log(`   [${attempts}/${maxAttempts}] Status: ${scanRecord.status}, Completed: ${scanRecord.completedHotels}/${scanRecord.totalHotels}`);
      
      if (scanRecord.status === 'completed') {
        console.log('✅ Scan completed!\n');
        break;
      }
      
      if (scanRecord.status === 'failed') {
        console.error(`❌ Scan failed: ${scanRecord.errorMessage}`);
        process.exit(1);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.error('❌ Scan timeout - took longer than 5 minutes');
      process.exit(1);
    }
    
    // Check results
    console.log('🔍 Step 4: Checking scan results...');
    const results = await db.getScanResultsWithHotels(progress.scanId);
    
    console.log(`📊 Results Summary:`);
    console.log(`   Total results: ${results.length}`);
    
    if (results.length === 0) {
      console.error('❌ No results found - scan failed to collect data');
      
      // Check for errors
      const errors = await db.getScraperErrorsForScan(progress.scanId);
      if (errors.length > 0) {
        console.error(`\n⚠️  Found ${errors.length} scraper errors:`);
        errors.slice(0, 3).forEach(err => {
          console.error(`   - ${err.errorType}: ${err.errorMessage.substring(0, 100)}...`);
        });
      }
      
      process.exit(1);
    }
    
    // Analyze results
    const pricesFound = results.filter(r => r.result.price !== null);
    const availableResults = results.filter(r => r.result.isAvailable);
    
    console.log(`   Results with prices: ${pricesFound.length}`);
    console.log(`   Available dates: ${availableResults.length}`);
    
    if (pricesFound.length > 0) {
      const prices = pricesFound.map(r => r.result.price / 100); // Convert from cents
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      
      console.log(`   Price range: ₪${minPrice} - ₪${maxPrice}`);
      console.log(`   Average price: ₪${Math.round(avgPrice)}`);
    }
    
    console.log('\n✅ TEST PASSED - Scan completed successfully with results!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED - Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
