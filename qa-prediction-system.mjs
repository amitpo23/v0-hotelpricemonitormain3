#!/usr/bin/env node
/**
 * QA Testing Suite for Prediction System V3
 * Tests all new V2 agents and integration
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface TestResult {
  name: string
  passed: boolean
  details: string
  duration: number
}

const results: TestResult[] = []

/**
 * Test helper
 */
async function runTest(
  name: string,
  testFn: () => Promise<boolean>
): Promise<void> {
  const start = Date.now()
  try {
    console.log(`\n🧪 Testing: ${name}...`)
    const passed = await testFn()
    const duration = Date.now() - start
    
    if (passed) {
      console.log(`✅ ${name} - PASSED (${duration}ms)`)
      results.push({ name, passed: true, details: 'Success', duration })
    } else {
      console.log(`❌ ${name} - FAILED (${duration}ms)`)
      results.push({ name, passed: false, details: 'Test returned false', duration })
    }
  } catch (error) {
    const duration = Date.now() - start
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.log(`❌ ${name} - ERROR: ${details} (${duration}ms)`)
    results.push({ name, passed: false, details, duration })
  }
}

/**
 * Test 1: Database Tables Exist
 */
async function testDatabaseTables(): Promise<boolean> {
  const tables = [
    'booking_curve_analysis',
    'cancellation_tracking',
    'price_sensitivity_log',
    'booking_velocity_snapshots',
    'prediction_accuracy',
    'model_performance_summary',
    'factor_performance',
    'cbs_tourism_data'
  ]

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`  ❌ Table '${table}' not found or error: ${error.message}`)
      return false
    }
    console.log(`  ✅ Table '${table}' exists`)
  }

  return true
}

/**
 * Test 2: CBS Tourism Data Populated
 */
async function testCBSData(): Promise<boolean> {
  const { data, error } = await supabase
    .from('cbs_tourism_data')
    .select('*')
    .limit(10)

  if (error) {
    console.log(`  ❌ Error: ${error.message}`)
    return false
  }

  if (!data || data.length === 0) {
    console.log('  ❌ No CBS data found')
    return false
  }

  console.log(`  ✅ Found ${data.length} CBS records`)
  console.log(`  📊 Sample: ${data[0].period} - ${data[0].region} - ${data[0].occupancy_rate}% occupancy`)
  return true
}

/**
 * Test 3: Bookings Table Has New Columns
 */
async function testBookingsColumns(): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings')
    .select('lead_time_days, cancellation_date')
    .limit(1)

  if (error) {
    console.log(`  ❌ Error: ${error.message}`)
    return false
  }

  console.log('  ✅ Bookings table has new columns: lead_time_days, cancellation_date')
  return true
}

/**
 * Test 4: Velocity Agent V2 Module
 */
async function testVelocityAgentV2(): Promise<boolean> {
  try {
    // Dynamic import to test module loads
    const module = await import('../lib/agents/velocity-agent-v2.js')
    
    if (!module.analyzeBookingVelocityV2) {
      console.log('  ❌ analyzeBookingVelocityV2 function not exported')
      return false
    }

    console.log('  ✅ Velocity Agent V2 module loads successfully')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 5: CBS Agent Module
 */
async function testCBSAgent(): Promise<boolean> {
  try {
    const module = await import('../lib/agents/cbs-agent.js')
    
    if (!module.fetchCBSData || !module.analyzeCBSMarketTrends) {
      console.log('  ❌ CBS Agent functions not exported')
      return false
    }

    console.log('  ✅ CBS Agent module loads successfully')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 6: Weather Agent Module
 */
async function testWeatherAgent(): Promise<boolean> {
  try {
    const module = await import('../lib/agents/weather-agent.js')
    
    if (!module.getWeatherForecast) {
      console.log('  ❌ getWeatherForecast function not exported')
      return false
    }

    console.log('  ✅ Weather Agent module loads successfully')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 7: Events Agent V2 Module
 */
async function testEventsAgentV2(): Promise<boolean> {
  try {
    const module = await import('../lib/agents/events-agent-v2.js')
    
    if (!module.getEnhancedEvents) {
      console.log('  ❌ getEnhancedEvents function not exported')
      return false
    }

    console.log('  ✅ Events Agent V2 module loads successfully')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 8: Orchestrator V3 Module
 */
async function testOrchestratorV3(): Promise<boolean> {
  try {
    const module = await import('../lib/agents/orchestrator-v3.js')
    
    if (!module.orchestrateComprehensiveDataV3 || !module.orchestrateSingleDateV3) {
      console.log('  ❌ Orchestrator V3 functions not exported')
      return false
    }

    console.log('  ✅ Orchestrator V3 module loads successfully')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 9: Feedback API Route
 */
async function testFeedbackAPI(): Promise<boolean> {
  try {
    // Try to import the route
    const module = await import('../app/api/feedback/accuracy/route.js')
    
    if (!module.GET || !module.POST) {
      console.log('  ❌ Feedback API GET/POST not exported')
      return false
    }

    console.log('  ✅ Feedback API route exists')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 10: Orchestrator V3 API Route
 */
async function testOrchestratorV3API(): Promise<boolean> {
  try {
    const module = await import('../app/api/orchestrator/v3/route.js')
    
    if (!module.GET) {
      console.log('  ❌ Orchestrator V3 API GET not exported')
      return false
    }

    console.log('  ✅ Orchestrator V3 API route exists')
    return true
  } catch (error) {
    console.log(`  ❌ Module error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return false
  }
}

/**
 * Test 11: Environment Variables
 */
async function testEnvironmentVariables(): Promise<boolean> {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const optional = [
    'OPENWEATHER_API_KEY',
    'DATA_GOV_IL_API_KEY',
    'EVENTBRITE_API_KEY',
    'SERPAPI_KEY',
    'TAVILY_API_KEY'
  ]

  let allRequired = true
  let optionalCount = 0

  for (const key of required) {
    if (!process.env[key]) {
      console.log(`  ❌ Missing required: ${key}`)
      allRequired = false
    } else {
      console.log(`  ✅ Found: ${key}`)
    }
  }

  for (const key of optional) {
    if (process.env[key]) {
      console.log(`  ✅ Found optional: ${key}`)
      optionalCount++
    } else {
      console.log(`  ⚠️  Missing optional: ${key}`)
    }
  }

  console.log(`  📊 ${optionalCount}/${optional.length} optional APIs configured`)
  
  return allRequired
}

/**
 * Test 12: SQL Functions Exist
 */
async function testSQLFunctions(): Promise<boolean> {
  const functions = [
    'update_lead_time',
    'calculate_accuracy_score',
    'update_prediction_actuals',
    'auto_update_prediction_actuals'
  ]

  // Check if functions exist in pg_proc
  for (const func of functions) {
    const { data, error } = await supabase.rpc(func).limit(0)
    
    // We expect an error if function exists but we called it wrong
    // If error is "function not found", that's bad
    if (error && error.message.includes('does not exist')) {
      console.log(`  ❌ Function '${func}' not found`)
      return false
    }
    console.log(`  ✅ Function '${func}' exists`)
  }

  return true
}

/**
 * Main test runner
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 QA TESTING SUITE - PREDICTION SYSTEM V3')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const startTime = Date.now()

  // Database tests
  console.log('\n📊 DATABASE TESTS:')
  await runTest('Database Tables Exist', testDatabaseTables)
  await runTest('CBS Tourism Data Populated', testCBSData)
  await runTest('Bookings Table Has New Columns', testBookingsColumns)
  await runTest('SQL Functions Exist', testSQLFunctions)

  // Module tests
  console.log('\n📦 MODULE TESTS:')
  await runTest('Velocity Agent V2 Module', testVelocityAgentV2)
  await runTest('CBS Agent Module', testCBSAgent)
  await runTest('Weather Agent Module', testWeatherAgent)
  await runTest('Events Agent V2 Module', testEventsAgentV2)
  await runTest('Orchestrator V3 Module', testOrchestratorV3)

  // API tests
  console.log('\n🌐 API ROUTE TESTS:')
  await runTest('Feedback API Route', testFeedbackAPI)
  await runTest('Orchestrator V3 API Route', testOrchestratorV3API)

  // Environment tests
  console.log('\n🔧 ENVIRONMENT TESTS:')
  await runTest('Environment Variables', testEnvironmentVariables)

  // Summary
  const totalTime = Date.now() - startTime
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const passRate = (passed / results.length * 100).toFixed(1)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 QA SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Passed: ${passed}/${results.length} (${passRate}%)`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  console.log(`⏱️  Total Time: ${totalTime}ms`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.details}`)
      })
  }

  console.log('\n✅ QA COMPLETE\n')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
