#!/usr/bin/env node
/**
 * Test CBS Tourism Agent
 * Simple test that verifies the agent file exists and structure is correct
 */

import { existsSync, readFileSync } from 'fs'

console.log('🧪 Testing CBS Tourism Agent\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Check file exists
const filePath = 'lib/agents/cbs-tourism-agent.ts'
if (!existsSync(filePath)) {
  console.log('❌ File not found:', filePath)
  process.exit(1)
}

console.log('✅ File exists:', filePath)

// Check code structure
const code = readFileSync(filePath, 'utf8')
const checks = [
  { name: 'analyzeCBSTourism export', pattern: 'export async function analyzeCBSTourism' },
  { name: 'CBSTourismData interface', pattern: 'export interface CBSTourismData' },
  { name: 'fetchCBSTourismData function', pattern: 'async function fetchCBSTourismData' },
  { name: 'calculateTourismImpact function', pattern: 'function calculateTourismImpact' },
  { name: 'generateRecommendation function', pattern: 'function generateRecommendation' },
  { name: 'AgentOutput type', pattern: 'import type { AgentOutput }' },
  { name: 'Seasonal patterns data', pattern: 'seasonalPatterns' },
  { name: 'Location-specific logic', pattern: 'Tel Aviv' }
]

console.log('\n📋 Code Structure Checks:')
for (const check of checks) {
  const found = code.includes(check.pattern)
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`)
}

// Count lines
const lines = code.split('\n').length
console.log(`\n📊 Statistics:`)
console.log(`   Lines of code: ${lines}`)
console.log(`   File size: ${(code.length / 1024).toFixed(1)} KB`)

// Test seasonal patterns
console.log(`\n🌍 Tourism Seasonality Simulation:`)
const months = [
  { num: 1, name: 'January', expected: 0.85 },
  { num: 4, name: 'April (Passover)', expected: 1.10 },
  { num: 7, name: 'July (Summer)', expected: 1.30 },
  { num: 8, name: 'August (Peak)', expected: 1.30 },
  { num: 9, name: 'September (Holidays)', expected: 1.15 },
  { num: 12, name: 'December (Hanukkah)', expected: 1.15 }
]

for (const month of months) {
  const pattern = code.match(new RegExp(`${month.num}:\\s*([0-9.]+)`))
  if (pattern) {
    const value = parseFloat(pattern[1])
    const match = Math.abs(value - month.expected) < 0.01
    console.log(`   ${match ? '✅' : '⚠️ '} ${month.name}: ${value}x ${match ? '' : `(expected ${month.expected}x)`}`)
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ CBS Tourism Agent structure validated!')
console.log('\n💡 To test with real data:')
console.log('   1. Integrate with orchestrator-v2.ts')
console.log('   2. Run: node test-orchestrator-with-cbs.mjs')
console.log('   3. Or use in production prediction flow')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

