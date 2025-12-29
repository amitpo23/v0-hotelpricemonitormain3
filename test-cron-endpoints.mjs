#!/usr/bin/env node

/**
 * Test the new Cron endpoints locally
 */

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

console.log('🧪 Testing Cron Endpoints\n');
console.log('===========================\n');

// Test 1: Monitor Scan
console.log('1️⃣ Testing Monitor Scan...');
try {
  const response = await fetch('http://localhost:3000/api/cron/monitor-scan', {
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`
    }
  });
  
  const data = await response.json();
  console.log('   Status:', response.status);
  console.log('   Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('   ✅ Monitor working!');
    if (data.progress) {
      console.log(`   📊 Progress: ${data.progress.percentage}%`);
    }
  }
} catch (error) {
  console.error('   ❌ Error:', error.message);
}

console.log('');

// Test 2: Auto Scan (commented out - only run manually)
console.log('2️⃣ Auto Scan endpoint ready');
console.log('   To test manually:');
console.log('   curl -X POST http://localhost:3000/api/cron/auto-scan \\');
console.log(`     -H "Authorization: Bearer ${CRON_SECRET}"`);
console.log('');

console.log('✅ Tests complete!\n');
