#!/usr/bin/env node

/**
 * SIMPLE SOLUTION: Just call the working API 90 times for Q1 2026!
 */

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';
const API_URL = 'http://localhost:3000/api/scans/execute';

async function main() {
  console.log('🚀 Simple Q1 2026 Fill - Use working API\n');
  
  let totalSaved = 0;
  let totalReal = 0;
  
  for (let i = 1; i <= 30; i++) {  // 30 scans for Q1
    console.log(`\n📊 Scan ${i}/30...`);
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({hotel_id: HOTEL_ID})
      });
      
      const data = await res.json();
      
      if (data.success) {
        totalSaved += data.results_count || 0;
        totalReal += data.real_scrapes || 0;
        console.log(`✅ Saved: ${data.results_count}, Real: ${data.real_scrapes}`);
      }
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`);
    }
    
    // Wait 10 seconds between scans
    await new Promise(r => setTimeout(r, 10000));
  }
  
  console.log(`\n\n🎉 DONE!`);
  console.log(`Total saved: ${totalSaved}`);
  console.log(`Total real: ${totalReal}`);
}

main();
