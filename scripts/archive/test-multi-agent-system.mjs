#!/usr/bin/env node

/**
 * Test Enhanced Multi-Agent Prediction System
 * Tests the new enhanced external data collection and confidence scoring
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEnhancedPredictions() {
  console.log('🧪 Testing Enhanced Multi-Agent Prediction System\n')
  console.log('='.repeat(60))

  // Step 1: Check environment
  console.log('\n📋 Step 1: Environment Check')
  console.log('-'.repeat(60))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`TAVILY_API_KEY: ${process.env.TAVILY_API_KEY ? '✓ Set' : '✗ Not set'}`)
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set'}`)

  // Step 2: Get test hotel
  console.log('\n🏨 Step 2: Fetching Test Hotel')
  console.log('-'.repeat(60))
  
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, name, base_price')
    .limit(1)

  if (hotelsError || !hotels || hotels.length === 0) {
    console.error('✗ Failed to fetch hotel:', hotelsError)
    return
  }

  const testHotel = hotels[0]
  console.log(`✓ Selected hotel: ${testHotel.name} (${testHotel.id})`)
  console.log(`  Base price: ₪${testHotel.base_price}`)

  // Step 3: Generate predictions with enhanced system
  console.log('\n🤖 Step 3: Generating Enhanced Predictions')
  console.log('-'.repeat(60))

  const requestBody = {
    hotels: [testHotel],
    hotelIds: [testHotel.id],
    daysAhead: 90,
    selectedMonths: [1, 3, 6, 7, 9],
    selectedYear: 2026,
    analysisParams: {
      includeCompetitors: true,
      includeSeasonality: true,
      includeEvents: true,
      includeOccupancy: true,
      includeBudget: true,
      includeFutureBookings: true,
      includeMarketTrends: true,
    }
  }

  console.log('\n📤 Sending request to /api/predictions/generate...')
  
  const startTime = Date.now()
  
  try {
    const response = await fetch('http://localhost:3000/api/predictions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      console.error(`✗ Request failed (${response.status}):`, error)
      return
    }

    const result = await response.json()

    console.log(`\n✓ Request completed in ${(duration / 1000).toFixed(2)}s`)
    console.log('\n📊 Results Summary:')
    console.log('-'.repeat(60))
    console.log(`Total predictions: ${result.count}`)
    console.log(`Average confidence: ${result.statistics?.avg_confidence}`)
    console.log(`Average price: ₪${result.statistics?.avg_price}`)

    console.log('\n🔍 Data Sources:')
    console.log('-'.repeat(60))
    console.log('Internal:')
    console.log(`  - Scan results: ${result.data_sources?.internal?.scan_results || 0}`)
    console.log(`  - Bookings: ${result.data_sources?.internal?.bookings || 0}`)
    console.log('\nExternal:')
    console.log(`  - Holidays: ${result.data_sources?.external?.holidays || 0}`)
    console.log(`  - Trends score: ${result.data_sources?.external?.trends_score || 'N/A'}`)

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
  }
}

// Run the test
testEnhancedPredictions().catch(console.error)
