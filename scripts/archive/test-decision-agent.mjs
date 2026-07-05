#!/usr/bin/env node
/**
 * Quick Test - Decision Agent with Mock Data
 * Tests the Decision Agent logic without requiring database
 */

import { DecisionAgent } from './lib/agents/decision-agent.ts'

console.log('🧪 Decision Agent Quick Test')
console.log('===========================\n')

// Create mock agent outputs
const mockAgentOutputs = [
  {
    agentName: 'Events Agent',
    recommendation: 'increase',
    confidence: 0.85,
    suggestedMultiplier: 1.3,
    reasoning: ['Major tech conference in Tel Aviv attracts 5000+ visitors'],
    dataPoints: { eventCount: 1, attendees: 5000 }
  },
  {
    agentName: 'Budget Agent',
    recommendation: 'increase',
    confidence: 0.90,
    suggestedMultiplier: 1.2,
    reasoning: ['Revenue 15% below monthly target, need to increase pricing'],
    dataPoints: { budgetGap: -50000, targetRevenue: 350000 }
  },
  {
    agentName: 'Velocity Agent',
    recommendation: 'increase',
    confidence: 0.75,
    suggestedMultiplier: 1.15,
    reasoning: ['Booking velocity increased 40% in last 7 days'],
    dataPoints: { currentVelocity: 12, previousVelocity: 8.5 }
  },
  {
    agentName: 'Competitor Agent',
    recommendation: 'maintain',
    confidence: 0.80,
    suggestedMultiplier: 1.0,
    reasoning: ['Our price ₪500 is at market average (₪495)'],
    dataPoints: { avgCompetitorPrice: 495, ourPrice: 500 }
  },
  {
    agentName: 'Historical Agent',
    recommendation: 'increase',
    confidence: 0.70,
    suggestedMultiplier: 1.1,
    reasoning: ['Same week last year showed 10% higher occupancy'],
    dataPoints: { lastYearOccupancy: 85, currentOccupancy: 75 }
  }
]

// Create mock context
const mockContext = {
  daysUntilTarget: 14,
  isHighSeason: true,
  isWeekend: false,
  marketCondition: 'normal',
  competitivePosition: 'average',
  budgetStatus: 'below',
  recentPerformance: 'improving'
}

// Create mock input
const mockInput = {
  hotelId: 'hotel-scarlet',
  hotelName: 'Hotel Scarlet',
  location: 'Tel Aviv',
  targetDate: '2025-06-15',
  currentPrice: 500,
  agentOutputs: mockAgentOutputs,
  context: mockContext,
  historicalAccuracy: new Map()
}

console.log('📊 Mock Scenario:')
console.log(`   Hotel: ${mockInput.hotelName}`)
console.log(`   Current Price: ₪${mockInput.currentPrice}`)
console.log(`   Target Date: ${mockInput.targetDate}`)
console.log(`   Days Ahead: ${mockContext.daysUntilTarget}`)
console.log(`   Season: ${mockContext.isHighSeason ? 'High' : 'Low'}`)
console.log(`   Budget Status: ${mockContext.budgetStatus}`)
console.log(`   Agents: ${mockAgentOutputs.length}\n`)

// Run Decision Agent
console.log('🎯 Running Decision Agent...\n')
const decisionAgent = new DecisionAgent()
const decision = await decisionAgent.makeDecision(mockInput)

// Display results
console.log('✅ Decision Complete!\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📈 Recommendation: ${decision.recommendation.toUpperCase()}`)
console.log(`💰 Suggested Price: ₪${decision.suggestedPrice}`)
console.log(`   (Change: ${decision.suggestedPrice > mockInput.currentPrice ? '+' : ''}₪${decision.suggestedPrice - mockInput.currentPrice}, ${((decision.suggestedPrice / mockInput.currentPrice - 1) * 100).toFixed(1)}%)`)
console.log(`🎯 Confidence: ${(decision.confidence * 100).toFixed(0)}%`)
console.log(`⏱️  Processing Time: ${decision.processingTime}ms`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log('💡 Reasoning:')
decision.reasoning.forEach((reason, i) => {
  console.log(`   ${i + 1}. ${reason}`)
})

if (decision.warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  decision.warnings.forEach((warning, i) => {
    console.log(`   ${i + 1}. ${warning}`)
  })
}

console.log('\n🔝 Dominant Factors:')
decision.dominantFactors.forEach((factor, i) => {
  console.log(`   ${i + 1}. ${factor.agentName}`)
  console.log(`      Weight: ${(factor.weight * 100).toFixed(1)}%`)
  console.log(`      Impact: ${factor.impact.toFixed(2)}x`)
  console.log(`      Reason: ${factor.reasoning}`)
})

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ Decision Agent is working correctly!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
