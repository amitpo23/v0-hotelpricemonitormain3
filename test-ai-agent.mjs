#!/usr/bin/env node

/**
 * Test AI Research Agent
 * Quick test for the Tavily + Claude integration
 */

import { researchMarketIntelligence, quickSearch } from './lib/research/internet-agent.ts'
import { analyzeMarketData } from './lib/llm/claude-client.ts'

async function testAgent() {
  console.log('🤖 Testing AI Research Agent...\n')

  try {
    // Test 1: Quick search
    console.log('📍 Test 1: Quick Internet Search')
    console.log('─'.repeat(50))
    
    const searchResult = await quickSearch('כנסים בתל אביב מרץ 2026')
    console.log('תוצאה:', searchResult.slice(0, 200))
    console.log('✅ Quick search works!\n')

    // Test 2: Market intelligence research
    console.log('📍 Test 2: Market Intelligence Research')
    console.log('─'.repeat(50))
    
    const intel = await researchMarketIntelligence(
      'The Jaffa Hotel',
      'Tel Aviv',
      '2026-03-15'
    )

    console.log(`📅 Events found: ${intel.events.length}`)
    console.log(`📰 News items: ${intel.news.length}`)
    console.log(`📊 Market trends: ${intel.marketTrends.factors.length} factors`)
    console.log(`📝 Raw data length: ${intel.rawData.length} chars`)
    
    if (intel.events.length > 0) {
      console.log('\nFirst event:')
      console.log(`  • ${intel.events[0].name}`)
      console.log(`  • Impact: ${intel.events[0].impact}`)
    }
    
    if (intel.news.length > 0) {
      console.log('\nFirst news:')
      console.log(`  • ${intel.news[0].title}`)
      console.log(`  • Sentiment: ${intel.news[0].sentiment}`)
    }

    console.log('✅ Market intelligence works!\n')

    // Test 3: Claude AI analysis
    console.log('📍 Test 3: Claude AI Analysis')
    console.log('─'.repeat(50))
    
    const analysis = await analyzeMarketData({
      hotelName: 'The Jaffa Hotel',
      location: 'Tel Aviv',
      targetDate: '2026-03-15',
      externalInfo: intel.rawData || 'No external data',
      historicalPrices: [1200, 1250, 1180, 1300, 1220],
      competitorPrices: [
        { name: 'The Norman', price: 1400 },
        { name: 'Brown Beach House', price: 1350 },
      ],
      currentOccupancy: 75,
    })

    console.log('תובנות:', analysis.insights)
    console.log(`המלצה: ${analysis.recommendation}`)
    console.log(`ביטחון: ${analysis.confidence}%`)
    console.log('נימוק:', analysis.reasoning)
    console.log('✅ Claude analysis works!\n')

    console.log('🎉 All tests passed!')
    console.log('\n💡 To use in production:')
    console.log('   POST /api/predictions/ai-insights')
    console.log('   { "hotelId": 1, "hotelName": "...", "targetDate": "..." }')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    
    if (error.message.includes('TAVILY_API_KEY')) {
      console.log('\n💡 Solution: Set TAVILY_API_KEY in environment')
      console.log('   Get free key at: https://tavily.com')
    }
    
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      console.log('\n💡 Solution: Set ANTHROPIC_API_KEY in environment')
      console.log('   Get key at: https://console.anthropic.com/')
    }

    process.exit(1)
  }
}

// Check environment variables
console.log('🔍 Checking environment variables...\n')

const checks = {
  'TAVILY_API_KEY': process.env.TAVILY_API_KEY,
  'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
}

let allGood = true
for (const [key, value] of Object.entries(checks)) {
  if (value) {
    console.log(`✅ ${key}: ${value.slice(0, 10)}...`)
  } else {
    console.log(`❌ ${key}: NOT SET`)
    allGood = false
  }
}

console.log('')

if (!allGood) {
  console.log('⚠️  Missing API keys. Tests may fail.')
  console.log('See docs/AI_AGENT_GUIDE.md for setup instructions.\n')
}

// Run tests
testAgent()
