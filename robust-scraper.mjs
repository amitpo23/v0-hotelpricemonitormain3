#!/usr/bin/env node
/**
 * Resilient Hotel Price Scraper
 * 
 * Features:
 * - Checkpoint system - saves progress after each date
 * - Auto-resume - continues from last checkpoint if interrupted
 * - Error recovery - retries failed scrapes
 * - Progress tracking - detailed logging
 * - State management - saves state to file
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

// Configuration
const CHECKPOINT_FILE = '.scan-checkpoint.json';
const STATE_FILE = '.scan-state.json';
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

/**
 * Load checkpoint from file
 */
function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_FILE)) {
    return null;
  }
  
  try {
    const data = readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading checkpoint:', error);
    return null;
  }
}

/**
 * Save checkpoint to file
 */
function saveCheckpoint(checkpoint) {
  try {
    writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    console.log(`💾 Checkpoint saved: ${checkpoint.completed_dates}/${checkpoint.total_dates} dates completed`);
  } catch (error) {
    console.error('❌ Error saving checkpoint:', error);
  }
}

/**
 * Get date range to scan
 */
function getDateRange(startDate, days) {
  const dates = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

/**
 * Call the scan API for a specific date
 */
async function scanDate(hotelId, date) {
  try {
    console.log(`\n🔍 Scanning ${date}...`);
    
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/scans/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hotel_id: hotelId,
        start_date: date,
        days_to_scan: 1, // One day at a time for better checkpointing
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.success) {
      console.log(`✅ Scan completed: ${data.results_count} prices found`);
      return {
        success: true,
        prices: data.results_count || 0,
      };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Scan failed for ${date}:`, errorMsg);
    return {
      success: false,
      prices: 0,
      error: errorMsg,
    };
  }
}

/**
 * Main scraper function
 */
async function runResilientScraper(startDate, totalDays) {
  console.log('🚀 Starting Resilient Hotel Price Scraper\n');
  console.log(`📅 Date range: ${startDate} + ${totalDays} days`);
  console.log(`🏨 Hotel ID: ${HOTEL_ID}\n`);

  // Load or create checkpoint
  let checkpoint = loadCheckpoint();
  const dates = getDateRange(startDate, totalDays);

  if (checkpoint && checkpoint.hotel_id === HOTEL_ID) {
    console.log('📂 Found existing checkpoint:');
    console.log(`   Started: ${checkpoint.started_at}`);
    console.log(`   Progress: ${checkpoint.completed_dates}/${checkpoint.total_dates} dates`);
    console.log(`   Last completed: ${checkpoint.last_completed_date || 'None'}`);
    console.log(`   Failed dates: ${checkpoint.failed_dates.length}`);
    console.log('\n🔄 Resuming from checkpoint...\n');
  } else {
    console.log('✨ No checkpoint found, starting fresh\n');
    checkpoint = {
      hotel_id: HOTEL_ID,
      last_completed_date: null,
      total_dates: dates.length,
      completed_dates: 0,
      failed_dates: [],
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      scrape_stats: {
        total_prices: 0,
        total_competitors: 0,
        successful_scrapes: 0,
        failed_scrapes: 0,
      },
    };
  }

  // Determine which dates to scan
  const datesToScan = checkpoint.last_completed_date
    ? dates.filter(d => d > checkpoint.last_completed_date)
    : dates;

  // Add failed dates for retry
  const allDatesToScan = [...new Set([...checkpoint.failed_dates, ...datesToScan])].sort();

  console.log(`📋 Dates to scan: ${allDatesToScan.length}`);
  console.log(`   New dates: ${datesToScan.length}`);
  console.log(`   Retry dates: ${checkpoint.failed_dates.length}\n`);

  // Scan each date
  for (const date of allDatesToScan) {
    const result = await scanDate(HOTEL_ID, date);

    if (result.success) {
      // Update checkpoint
      checkpoint.completed_dates++;
      checkpoint.last_completed_date = date;
      checkpoint.scrape_stats.total_prices += result.prices;
      checkpoint.scrape_stats.successful_scrapes++;
      
      // Remove from failed dates if it was there
      checkpoint.failed_dates = checkpoint.failed_dates.filter(d => d !== date);
    } else {
      // Mark as failed
      checkpoint.scrape_stats.failed_scrapes++;
      if (!checkpoint.failed_dates.includes(date)) {
        checkpoint.failed_dates.push(date);
      }
    }

    // Update checkpoint after each date
    checkpoint.last_updated = new Date().toISOString();
    saveCheckpoint(checkpoint);

    // Progress report
    const progress = ((checkpoint.completed_dates / checkpoint.total_dates) * 100).toFixed(1);
    console.log(`\n📊 Progress: ${checkpoint.completed_dates}/${checkpoint.total_dates} (${progress}%)`);
    console.log(`   Prices collected: ${checkpoint.scrape_stats.total_prices}`);
    console.log(`   Success rate: ${checkpoint.scrape_stats.successful_scrapes}/${checkpoint.scrape_stats.successful_scrapes + checkpoint.scrape_stats.failed_scrapes}`);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 Scan Complete!\n');
  console.log('📊 Final Statistics:');
  console.log(`   Total dates scanned: ${checkpoint.completed_dates}/${checkpoint.total_dates}`);
  console.log(`   Total prices collected: ${checkpoint.scrape_stats.total_prices}`);
  console.log(`   Successful scrapes: ${checkpoint.scrape_stats.successful_scrapes}`);
  console.log(`   Failed scrapes: ${checkpoint.scrape_stats.failed_scrapes}`);
  console.log(`   Failed dates remaining: ${checkpoint.failed_dates.length}`);
  
  if (checkpoint.failed_dates.length > 0) {
    console.log(`\n⚠️  Failed dates (can be retried):`);
    checkpoint.failed_dates.forEach(d => console.log(`     - ${d}`));
  }
  
  console.log('\n═══════════════════════════════════════════════════');

  // Clean up checkpoint if 100% complete
  if (checkpoint.failed_dates.length === 0 && checkpoint.completed_dates === checkpoint.total_dates) {
    console.log('\n✨ All dates completed successfully! Cleaning up checkpoint...');
    if (existsSync(CHECKPOINT_FILE)) {
      writeFileSync(CHECKPOINT_FILE + '.completed', readFileSync(CHECKPOINT_FILE));
      // Don't delete, just rename
    }
  }
}

/**
 * CLI usage
 */
const args = process.argv.slice(2);
const startDate = args[0] || new Date().toISOString().split('T')[0];
const totalDays = parseInt(args[1] || '90');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Resilient Hotel Price Scraper

Usage:
  node robust-scraper.mjs [start_date] [days]

Arguments:
  start_date    Start date in YYYY-MM-DD format (default: today)
  days          Number of days to scan (default: 90)

Options:
  --help, -h    Show this help message
  --reset       Reset checkpoint and start fresh

Examples:
  node robust-scraper.mjs                        # Scan 90 days from today
  node robust-scraper.mjs 2026-01-01 90          # Scan Q1 2026
  node robust-scraper.mjs 2026-01-01 30 --reset  # Reset and scan 30 days

Features:
  - Automatically saves progress after each date
  - Resumes from last checkpoint if interrupted
  - Retries failed dates
  - Detailed progress tracking
  `);
  process.exit(0);
}

if (args.includes('--reset')) {
  console.log('🔄 Resetting checkpoint...\n');
  if (existsSync(CHECKPOINT_FILE)) {
    writeFileSync(CHECKPOINT_FILE + '.backup', readFileSync(CHECKPOINT_FILE));
    writeFileSync(CHECKPOINT_FILE, '');
  }
}

// Run the scraper
runResilientScraper(startDate, totalDays)
  .then(() => {
    console.log('\n✅ Scraper finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraper failed:', error);
    process.exit(1);
  });
