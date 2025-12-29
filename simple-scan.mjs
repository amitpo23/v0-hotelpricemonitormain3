#!/usr/bin/env node

/**
 * Simple scan trigger - just triggers the existing scan mechanism
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';

async function runScan() {
  console.log('🚀 Triggering scan...\n');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id: HOTEL_ID })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    
    console.log('✅ Scan completed:\n');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
  }
}

runScan();
