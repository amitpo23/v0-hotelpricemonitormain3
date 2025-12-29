#!/usr/bin/env node

/**
 * Direct Q1 2026 data population - bypasses API limitations
 * Runs Python scraper directly for each date and saves to DB
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Load .env.local manually
let SUPABASE_URL, SUPABASE_KEY;
try {
  const envContent = readFileSync('.env.local', 'utf-8');
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=').map(s => s.trim()))
  );
  SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;
} catch (e) {
  SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'set' : 'missing');
  console.error('SUPABASE_KEY:', SUPABASE_KEY ? 'set' : 'missing');
  process.exit(1);
}
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const PYTHON_PATH = '/home/codespace/.python/current/bin/python3';
const SCRAPER_PATH = '/workspaces/v0-hotelpricemonitormain3/scraper_v5.py';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function scrapeWithPython(hotelName, city, checkIn, checkOut) {
  return new Promise((resolve) => {
    const args = [SCRAPER_PATH, hotelName, city, checkIn, checkOut];
    const process = spawn(PYTHON_PATH, args);
    
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        resolve({ success: false, error: errorOutput });
        return;
      }
      
      try {
        const result = JSON.parse(output);
        resolve({ success: true, data: result });
      } catch (e) {
        resolve({ success: false, error: 'Failed to parse output' });
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      process.kill();
      resolve({ success: false, error: 'Timeout' });
    }, 30000);
  });
}

async function main() {
  console.log('🚀 Q1 2026 Direct Data Population');
  console.log('==================================\n');
  
  // Get hotel info
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', HOTEL_ID)
    .single();
  
  if (!hotel) {
    console.error('❌ Hotel not found');
    return;
  }
  
  console.log(`🏨 Hotel: ${hotel.name}`);
  console.log(`📍 City: ${hotel.city}\n`);
  
  // Get active competitors
  const { data: competitors } = await supabase
    .from('hotel_competitors')
    .select('*')
    .eq('hotel_id', HOTEL_ID)
    .eq('is_active', true);
  
  if (!competitors || competitors.length === 0) {
    console.error('❌ No active competitors');
    return;
  }
  
  console.log(`👥 Found ${competitors.length} competitors\n`);
  
  // Date range
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-03-31');
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log(`📅 Scanning: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`📊 Total days: ${totalDays}\n`);
  
  let savedCount = 0;
  let errorCount = 0;
  let currentDate = new Date(startDate);
  let dayNum = 0;
  
  // Main loop: for each day
  while (currentDate <= endDate) {
    dayNum++;
    const checkIn = formatDate(currentDate);
    const checkOut = formatDate(addDays(currentDate, 1));
    
    console.log(`\n📆 Day ${dayNum}/${totalDays}: ${checkIn}`);
    
    // For each competitor
    for (const competitor of competitors) {
      try {
        const result = await scrapeWithPython(
          competitor.competitor_hotel_name,
          hotel.city,
          checkIn,
          checkOut
        );
        
        if (result.success && result.data && result.data.length > 0) {
          // Save each room price
          for (const room of result.data) {
            const { error } = await supabase
              .from('competitor_daily_prices')
              .insert({
                hotel_id: HOTEL_ID,
                competitor_id: competitor.id,
                date: checkIn,
                price: room.price,
                room_type: room.roomType || 'Standard Room',
                source: 'Booking.com',
                currency: room.currency || 'ILS',
                scraped_at: new Date().toISOString()
              });
            
            if (!error) {
              savedCount++;
              process.stdout.write('.');
            } else if (error.code === '23505') {
              // Duplicate - skip silently
              process.stdout.write('-');
            } else {
              errorCount++;
              process.stdout.write('x');
            }
          }
        } else {
          process.stdout.write('_');
        }
      } catch (e) {
        errorCount++;
        process.stdout.write('x');
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
    
    // Progress update every 10 days
    if (dayNum % 10 === 0) {
      console.log(`\n   Progress: ${dayNum}/${totalDays} days | Saved: ${savedCount} | Errors: ${errorCount}`);
    }
  }
  
  console.log('\n\n✅ Completed!');
  console.log(`📊 Final stats:`);
  console.log(`   Days processed: ${dayNum}`);
  console.log(`   Prices saved: ${savedCount}`);
  console.log(`   Errors: ${errorCount}`);
}

main().catch(console.error);
