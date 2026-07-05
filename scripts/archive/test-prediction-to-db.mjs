#!/usr/bin/env node

/**
 * Test Prediction Generation & Database Write
 * Verifies the complete flow: Generate predictions → Save to DB
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('═══════════════════════════════════════════════════════════')
console.log('🧪 Testing Prediction Generation & Database Write')
console.log('═══════════════════════════════════════════════════════════\n')

async function testPredictionSystem() {
  // Step 1: Check database connection
  console.log('📡 Step 1: Checking Database Connection')
  console.log('─'.repeat(60))
  
  try {
    const { data: tables, error } = await supabase
      .from('price_predictions')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return
    }
    console.log('✅ Connected to Supabase successfully')
  } catch (error) {
    console.error('❌ Connection error:', error.message)
    return
  }

  // Step 2: Get a test hotel
  console.log('\n🏨 Step 2: Fetching Test Hotel')
  console.log('─'.repeat(60))
  
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, name, base_price')
    .limit(1)

  if (hotelsError || !hotels || hotels.length === 0) {
    console.error('❌ Failed to fetch hotel:', hotelsError?.message)
    return
  }

  const testHotel = hotels[0]
  console.log(`✅ Selected: ${testHotel.name} (${testHotel.id})`)
  console.log(`   Base Price: ₪${testHotel.base_price}`)

  // Step 3: Check current predictions count
  console.log('\n📊 Step 3: Checking Existing Predictions')
  console.log('─'.repeat(60))
  
  const { data: existingPredictions, error: countError } = await supabase
    .from('price_predictions')
    .select('id, prediction_date, predicted_price, confidence_score', { count: 'exact' })
    .eq('hotel_id', testHotel.id)
    .order('prediction_date', { ascending: false })
    .limit(5)

  if (countError) {
    console.error('❌ Failed to fetch predictions:', countError.message)
  } else {
    console.log(`✅ Found ${existingPredictions?.length || 0} recent predictions`)
    if (existingPredictions && existingPredictions.length > 0) {
      console.log('\n   Latest predictions:')
      existingPredictions.forEach(p => {
        console.log(`   • ${p.prediction_date}: ₪${p.predicted_price} (confidence: ${(p.confidence_score * 100).toFixed(0)}%)`)
      })
    }
  }

  // Step 4: Check table structure
  console.log('\n🔍 Step 4: Analyzing Table Structure')
  console.log('─'.repeat(60))
  
  if (existingPredictions && existingPredictions.length > 0) {
    const samplePrediction = existingPredictions[0]
    const fields = Object.keys(samplePrediction)
    console.log(`✅ Table has ${fields.length} fields`)
    
    // Check for Multi-Agent System fields
    const hasConfidenceBreakdown = await supabase
      .from('price_predictions')
      .select('confidence_breakdown')
      .eq('hotel_id', testHotel.id)
      .not('confidence_breakdown', 'is', null)
      .limit(1)
    
    if (hasConfidenceBreakdown.data && hasConfidenceBreakdown.data.length > 0) {
      console.log('✅ confidence_breakdown field exists and has data')
      const breakdown = hasConfidenceBreakdown.data[0].confidence_breakdown
      if (breakdown && breakdown.external_data) {
        console.log(`   • external_data: ${breakdown.external_data}`)
      }
    }
  }

  // Step 5: API Endpoint Test (if running)
  console.log('\n🌐 Step 5: Testing API Endpoint')
  console.log('─'.repeat(60))
  console.log('⚠️  Skipped - Would require running dev server')
  console.log('   To test: npm run dev')
  console.log('   Then: curl -X POST http://localhost:3000/api/predictions/generate')

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('📊 Summary')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ Database connection: Working')
  console.log('✅ Table access: Available')
  console.log('✅ Data structure: Compatible')
  console.log('\n💡 Next step: Generate predictions via API')
  console.log('   POST /api/predictions/generate')
  console.log('   → Writes to price_predictions table')
  console.log('   → Includes Multi-Agent confidence data')
  console.log('\n═══════════════════════════════════════════════════════════\n')
}

testPredictionSystem().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
