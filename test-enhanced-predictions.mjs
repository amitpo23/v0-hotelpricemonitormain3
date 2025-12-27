#!/usr/bin/env node

/**
 * Test script for enhanced prediction system
 * Tests all new components independently
 */

import { predictPriceEnhanced, predictPricesEnhancedBatch } from './lib/prediction-algorithms.ts';

console.log('🧪 Testing Enhanced Prediction System\n');
console.log('=====================================\n');

// Test data
const testHotelId = '716e1e8f-3537-4f67-875d-de3a89642175'; // Scarlet Tel Aviv
const testDate = new Date('2026-02-14'); // Valentine's Day - high demand period

console.log('📅 Test Date:', testDate.toISOString().split('T')[0]);
console.log('🏨 Hotel ID:', testHotelId);
console.log('\n---\n');

// Test 1: Enhanced Single Prediction
console.log('TEST 1: Enhanced Single Date Prediction');
console.log('---------------------------------------');
try {
  const result = await predictPriceEnhanced(testHotelId, testDate);
  
  console.log('✅ Prediction Result:');
  console.log('   Predicted Price:', `₪${result.predictedPrice.toFixed(2)}`);
  console.log('   Confidence Score:', `${(result.confidence * 100).toFixed(1)}%`);
  console.log('   Algorithm:', result.algorithm);
  console.log('\n📊 Contributing Factors:');
  
  const factors = result.factors || {};
  Object.entries(factors).forEach(([key, value]) => {
    if (typeof value === 'number') {
      console.log(`   - ${key}: ${value.toFixed(3)}`);
    } else if (typeof value === 'object') {
      console.log(`   - ${key}:`, JSON.stringify(value, null, 2).split('\n').map((l, i) => i === 0 ? l : '     ' + l).join('\n'));
    } else {
      console.log(`   - ${key}: ${value}`);
    }
  });
  
  console.log('\n📈 Data Quality:');
  const quality = result.dataQuality || {};
  Object.entries(quality).forEach(([key, value]) => {
    const icon = value ? '✓' : '✗';
    console.log(`   ${icon} ${key}: ${value}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n---\n');

// Test 2: Batch Predictions
console.log('TEST 2: Enhanced Batch Predictions (7 days)');
console.log('-------------------------------------------');
try {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(testDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  
  const batchResults = await predictPricesEnhancedBatch(testHotelId, dates);
  
  console.log(`✅ Generated ${batchResults.length} predictions\n`);
  console.log('Date       | Price  | Confidence | Factors Used');
  console.log('-----------|--------|------------|-------------');
  
  batchResults.forEach(result => {
    const date = result.date.toISOString().split('T')[0];
    const price = `₪${result.predictedPrice.toFixed(0)}`.padEnd(6);
    const conf = `${(result.confidence * 100).toFixed(0)}%`.padEnd(10);
    const factorCount = Object.keys(result.factors || {}).length;
    console.log(`${date} | ${price} | ${conf} | ${factorCount} factors`);
  });
  
  // Calculate summary statistics
  const avgPrice = batchResults.reduce((sum, r) => sum + r.predictedPrice, 0) / batchResults.length;
  const avgConf = batchResults.reduce((sum, r) => sum + r.confidence, 0) / batchResults.length;
  const minPrice = Math.min(...batchResults.map(r => r.predictedPrice));
  const maxPrice = Math.max(...batchResults.map(r => r.predictedPrice));
  
  console.log('\n📊 Summary Statistics:');
  console.log(`   Average Price: ₪${avgPrice.toFixed(2)}`);
  console.log(`   Price Range: ₪${minPrice.toFixed(2)} - ₪${maxPrice.toFixed(2)}`);
  console.log(`   Average Confidence: ${(avgConf * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n---\n');

// Test 3: Component Status Check
console.log('TEST 3: Component Status Check');
console.log('------------------------------');

const components = [
  { name: 'Weather Service', path: './lib/external/weather-service.ts' },
  { name: 'Booking Velocity', path: './lib/analytics/booking-velocity.ts' },
  { name: 'Year-over-Year', path: './lib/analytics/year-over-year.ts' },
  { name: 'Feature Engineering', path: './lib/features/feature-engineering.ts' },
  { name: 'Enhanced RAG Context', path: './lib/rag/prediction-context.ts' },
  { name: 'Enhanced API Route', path: './app/api/predictions/enhanced/route.ts' },
];

for (const component of components) {
  try {
    await import(component.path);
    console.log(`✅ ${component.name}`);
  } catch (error) {
    console.log(`❌ ${component.name}: ${error.message}`);
  }
}

console.log('\n=====================================');
console.log('🎉 Enhanced Prediction System Test Complete!\n');

// Environment check
console.log('📌 Environment Configuration:');
console.log(`   OpenWeather API: ${process.env.OPENWEATHER_API_KEY ? '✅ Configured' : '❌ Not configured (get free key at openweathermap.org)'}`);
console.log(`   Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);

console.log('\n💡 Next Steps:');
console.log('   1. Set OPENWEATHER_API_KEY environment variable');
console.log('   2. Test API endpoints: curl -X POST http://localhost:3000/api/predictions/enhanced');
console.log('   3. Integrate into UI dashboards');
console.log('   4. Monitor accuracy over 30 days');
console.log('   5. Consider ML pipeline for further improvements\n');
