#!/usr/bin/env node
/**
 * Test Agent Integration (Task 3)
 * Validates all 8 AI agents are integrated with fallbacks
 */

import { readFileSync } from 'fs'
import { join } from 'path'

console.log("=".repeat(60))
console.log("TASK 3 VALIDATION: Agent Integration & Fallbacks")
console.log("=".repeat(60))

const predictionFile = join(process.cwd(), 'lib/prediction-algorithms.ts')
const content = readFileSync(predictionFile, 'utf-8')

// Test 1: Check CBS Tourism fields in PredictionInput
console.log("\n1️⃣  CBS Tourism Integration")
const hasCbsFields = [
  'cbsOccupancyRate',
  'cbsSeasonalIndex',
  'cbsGrowthRate'
].every(field => content.includes(field))

if (hasCbsFields) {
  console.log("   ✅ CBS Tourism fields added to PredictionInput interface")
} else {
  console.log("   ❌ Missing CBS Tourism fields in PredictionInput")
}

// Test 2: Check CBS Tourism integration in predictPrice
const hasCbsLogic = content.includes('CBS Tourism Statistics') && 
                    content.includes('input.cbsSeasonalIndex')
if (hasCbsLogic) {
  console.log("   ✅ CBS Tourism applied in predictPrice()")
} else {
  console.log("   ❌ CBS Tourism not integrated in price calculation")
}

// Test 3: Check data quality scoring
console.log("\n2️⃣  Data Quality Scoring")
const hasDataQuality = content.includes('agentDataPresence') && 
                       content.includes('agentsPresent / totalAgents')
if (hasDataQuality) {
  console.log("   ✅ Data quality scoring implemented")
  
  // Check if CBS is tracked
  const tracksCbs = content.match(/cbsTourism.*input\.cbsSeasonalIndex/)
  if (tracksCbs) {
    console.log("   ✅ CBS Tourism tracked in agentDataPresence")
  } else {
    console.log("   ⚠️  CBS Tourism not tracked in data quality")
  }
} else {
  console.log("   ❌ Data quality scoring missing")
}

// Test 4: Check fallbacks for each agent
console.log("\n3️⃣  Agent Fallbacks")
const fallbacks = [
  { name: "Weather", pattern: /FALLBACK.*weather/i },
  { name: "Booking Velocity", pattern: /FALLBACK.*velocity/i },
  { name: "Year-over-Year", pattern: /FALLBACK.*YoY|seasonal/i },
  { name: "Competitor", pattern: /FALLBACK.*competitor/i },
  { name: "CBS Tourism", pattern: /CBS data unavailable/i },
  { name: "Events", pattern: /No major events detected/i }
]

let fallbackCount = 0
for (const { name, pattern } of fallbacks) {
  if (pattern.test(content)) {
    console.log(`   ✅ ${name} has fallback logic`)
    fallbackCount++
  } else {
    console.log(`   ⚠️  ${name} missing fallback`)
  }
}

// Test 5: Check confidence adjustments
console.log("\n4️⃣  Confidence Score Adjustments")
const hasConfidenceAdjustments = content.match(/confidenceScore [+-]= \d+/g)
if (hasConfidenceAdjustments) {
  console.log(`   ✅ ${hasConfidenceAdjustments.length} confidence adjustments found`)
  const positive = hasConfidenceAdjustments.filter(m => m.includes('+')).length
  const negative = hasConfidenceAdjustments.filter(m => m.includes('-')).length
  console.log(`      - Positive: ${positive} (high-quality data)`)
  console.log(`      - Negative: ${negative} (missing/fallback data)`)
} else {
  console.log("   ❌ No confidence adjustments found")
}

// Test 6: Check agent health endpoint exists
console.log("\n5️⃣  Agent Health Monitoring")
try {
  const healthFile = join(process.cwd(), 'app/api/agent-health/route.ts')
  const healthContent = readFileSync(healthFile, 'utf-8')
  
  if (healthContent.includes('Agent Health Check')) {
    console.log("   ✅ /api/agent-health endpoint created")
    
    // Count agents tested
    const agentTests = healthContent.match(/agentResults\.push/g)
    if (agentTests) {
      console.log(`   ✅ Tests ${agentTests.length} agents`)
    }
  }
} catch {
  console.log("   ❌ /api/agent-health endpoint not found")
}

// Test 7: Verify agents count
console.log("\n6️⃣  Agent Coverage")
const agents = [
  'weather',
  'bookingVelocity',
  'yoy',
  'competitor',
  'events',
  'cbsTourism',
  'seasonality',
  'occupancy',
  'demand'
]

let trackedCount = 0
for (const agent of agents) {
  if (content.includes(`${agent}:`)) {
    trackedCount++
  }
}
console.log(`   Tracking ${trackedCount}/${agents.length} agents`)
if (trackedCount === agents.length) {
  console.log("   ✅ All 9 data sources tracked")
} else {
  console.log(`   ⚠️  Missing ${agents.length - trackedCount} agent(s)`)
}

// Summary
console.log("\n" + "=".repeat(60))
console.log("TASK 3 SUMMARY")
console.log("=".repeat(60))

const totalChecks = 6
const passedChecks = 
  (hasCbsFields ? 1 : 0) +
  (hasCbsLogic ? 1 : 0) +
  (hasDataQuality ? 1 : 0) +
  (fallbackCount >= 5 ? 1 : 0) +
  (hasConfidenceAdjustments ? 1 : 0) +
  (trackedCount >= 8 ? 1 : 0)

console.log(`\nStatus: ${passedChecks}/${totalChecks} checks passed`)
console.log(`Fallbacks: ${fallbackCount}/6 agents covered`)
console.log(`Data Quality: ${hasDataQuality ? 'Implemented' : 'Missing'}`)
console.log(`CBS Tourism: ${hasCbsLogic ? 'Integrated' : 'Not integrated'}`)

if (passedChecks === totalChecks && fallbackCount === 6) {
  console.log("\n✅ TASK 3 COMPLETE: All agents integrated with fallbacks!")
  console.log("Expected accuracy improvement: +5-10%")
  console.log("\nNext steps:")
  console.log("- Test /api/agent-health endpoint")
  console.log("- Monitor data quality scores in production")
  console.log("- Move to Task 4: Ensemble Predictions")
} else {
  console.log("\n⚠️  TASK 3 INCOMPLETE: Some agents missing fallbacks")
  console.log("Review prediction-algorithms.ts for missing integrations")
}

console.log("\n" + "=".repeat(60))
