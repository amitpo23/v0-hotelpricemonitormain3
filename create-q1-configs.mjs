#!/usr/bin/env node
/**
 * Create scan configs for Q1 2026 - 18 configs for 5-day periods
 * Then trigger them all at once
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
);

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_KEY);
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('📋 Creating Q1 2026 Scan Configs\n');
  
  const startDate = new Date('2026-01-01');
  const configs = [];
  
  // Create 18 configs for 5-day periods
  for (let i = 0; i < 18; i++) {
    const checkIn = formatDate(addDays(startDate, i * 5));
    const checkOut = formatDate(addDays(startDate, (i * 5) + 5));
    
    configs.push({
      hotel_id: HOTEL_ID,
      check_in_date: checkIn,
      check_out_date: checkOut,
      room_type: 'Standard Room',
      guests: 2,
      frequency: 'once',
      is_active: true,
      name: `Q1 2026 Batch ${i + 1} (${checkIn} to ${checkOut})`
    });
    
    console.log(`✅ Config ${i + 1}/18: ${checkIn} to ${checkOut}`);
  }
  
  // Insert all configs
  console.log('\n💾 Saving to database...');
  const { data, error } = await supabase
    .from('scan_configs')
    .insert(configs)
    .select();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n✅ Created ${data.length} scan configs!`);
  console.log(`\n📊 Now run the batch scan API to execute them all:`);
  console.log(`   POST http://localhost:3000/api/scans/batch`);
  console.log(`   Body: { "hotel_id": "${HOTEL_ID}" }`);
  
  // Now trigger the batch API
  console.log('\n🚀 Triggering batch scan...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/scans/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id: HOTEL_ID })
    });
    
    const result = await response.json();
    console.log('📦 Batch scan response:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('⚠️  Could not trigger batch scan:', e.message);
    console.log('   You can trigger it manually via the API');
  }
}

main().catch(console.error);
