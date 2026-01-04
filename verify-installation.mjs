#!/usr/bin/env node
/**
 * Quick Test - Decision Agent Installation Check
 * Verifies the Decision Agent files exist and are ready
 */

import { existsSync } from 'fs'
import { readFileSync } from 'fs'

console.log('🧪 Decision Agent Installation Check')
console.log('====================================\n')

const files = [
  { path: 'lib/agents/decision-agent.ts', name: 'Decision Agent Core' },
  { path: 'lib/agents/orchestrator-v2.ts', name: 'Enhanced Orchestrator' },
  { path: 'lib/prediction-algorithms.ts', name: 'Enhanced Prediction Engine' },
  { path: 'create-decision-agent-tables.sql', name: 'Database Schema' },
  { path: 'DECISION_AGENT_GUIDE.md', name: 'Usage Guide' },
  { path: 'PHASE_1_COMPLETE.md', name: 'Implementation Summary' },
  { path: 'FULL_IMPLEMENTATION_ROADMAP.md', name: '12-Week Roadmap' },
  { path: 'QUICK_START.md', name: 'Quick Start Guide' },
  { path: 'TODO.md', name: 'Task Tracker' }
]

console.log('📁 File Check:')
let allExist = true
for (const file of files) {
  const exists = existsSync(file.path)
  const icon = exists ? '✅' : '❌'
  console.log(`${icon} ${file.name}`)
  if (!exists) allExist = false
}

console.log('\n📊 Code Statistics:')

// Check decision-agent.ts
if (existsSync('lib/agents/decision-agent.ts')) {
  const content = readFileSync('lib/agents/decision-agent.ts', 'utf8')
  const lines = content.split('\n').length
  const hasDecisionAgent = content.includes('export class DecisionAgent')
  const hasMakeDecision = content.includes('async makeDecision(')
  const hasDynamicWeights = content.includes('calculateDynamicWeights(')
  const hasConflictDetection = content.includes('detectConflicts(')
  
  console.log(`   Decision Agent: ${lines} lines`)
  console.log(`   ✅ DecisionAgent class: ${hasDecisionAgent ? 'Found' : 'Missing'}`)
  console.log(`   ✅ makeDecision(): ${hasMakeDecision ? 'Found' : 'Missing'}`)
  console.log(`   ✅ Dynamic Weighting: ${hasDynamicWeights ? 'Found' : 'Missing'}`)
  console.log(`   ✅ Conflict Detection: ${hasConflictDetection ? 'Found' : 'Missing'}`)
}

// Check orchestrator integration
if (existsSync('lib/agents/orchestrator-v2.ts')) {
  const content = readFileSync('lib/agents/orchestrator-v2.ts', 'utf8')
  const hasImport = content.includes('import { DecisionAgent }')
  const hasDecisionField = content.includes('decision?:')
  const hasDecisionCode = content.includes('decisionAgent.makeDecision')
  
  console.log('\n   Orchestrator Integration:')
  console.log(`   ✅ Decision Agent Import: ${hasImport ? 'Yes' : 'No'}`)
  console.log(`   ✅ Decision Field: ${hasDecisionField ? 'Yes' : 'No'}`)
  console.log(`   ✅ Decision Logic: ${hasDecisionCode ? 'Yes' : 'No'}`)
}

// Check prediction engine integration
if (existsSync('lib/prediction-algorithms.ts')) {
  const content = readFileSync('lib/prediction-algorithms.ts', 'utf8')
  const hasPredictWithDecision = content.includes('predictPriceWithDecisionAgent')
  
  console.log('\n   Prediction Engine Enhancement:')
  console.log(`   ✅ predictPriceWithDecisionAgent(): ${hasPredictWithDecision ? 'Found' : 'Missing'}`)
}

console.log('\n🗄️  Database Status:')
console.log('   Run: node check-decision-agent-tables.mjs')
console.log('   To verify tables are created')

console.log('\n📚 Documentation:')
console.log('   - Usage Guide: DECISION_AGENT_GUIDE.md')
console.log('   - Quick Start: QUICK_START.md')
console.log('   - Full Roadmap: FULL_IMPLEMENTATION_ROADMAP.md')
console.log('   - Task List: TODO.md')

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
if (allExist) {
  console.log('✅ All Phase 1 files are installed!')
  console.log('\n🎯 Next Steps:')
  console.log('   1. Create database tables:')
  console.log('      • Visit: https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/editor')
  console.log('      • Paste contents of: create-decision-agent-tables.sql')
  console.log('   2. Verify tables: node check-decision-agent-tables.mjs')
  console.log('   3. Start using Decision Agent (see QUICK_START.md)')
} else {
  console.log('❌ Some files are missing!')
  console.log('   Please run: git pull')
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
