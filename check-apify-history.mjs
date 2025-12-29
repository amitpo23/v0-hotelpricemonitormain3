import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const apiKey = envFile.match(/APIFY_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.log('❌ לא נמצא APIFY_API_KEY');
  process.exit(1);
}

console.log('🔍 מחפש הרצות APIFY מהיממה האחרונה...\n');

// Get recent runs
const response = await fetch(`https://api.apify.com/v2/acts/runs?token=${apiKey}&limit=100`);
const data = await response.json();

if (data.data && data.data.items) {
  console.log(`📊 נמצאו ${data.data.items.length} הרצות\n`);
  
  // Filter runs from last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = data.data.items.filter(run => new Date(run.startedAt) > yesterday);
  
  console.log(`🕐 ${recentRuns.length} הרצות מהיממה האחרונה:\n`);
  
  for (const run of recentRuns.slice(0, 30)) {
    console.log(`─────────────────────────────────────────────`);
    console.log(`Run ID: ${run.id}`);
    console.log(`Actor: ${run.actId}`);
    console.log(`Status: ${run.status}`);
    console.log(`Started: ${run.startedAt}`);
    console.log(`Dataset ID: ${run.defaultDatasetId}`);
    
    if (run.defaultDatasetId && run.status === 'SUCCEEDED') {
      // Fetch dataset
      const dsResponse = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${apiKey}`);
      const items = await dsResponse.json();
      
      if (items && items.length > 0) {
        console.log(`�� ${items.length} פריטים בדאטאסט!`);
        
        // Show first item structure
        const first = items[0];
        if (first.price || first.totalPrice || first.rooms) {
          console.log(`   💰 מבנה: ${JSON.stringify(Object.keys(first))}`);
        }
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }
} else {
  console.log('❌ לא נמצאו הרצות');
}
