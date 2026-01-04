#!/usr/bin/env node
/**
 * Test the monitoring API endpoint
 * Usage: node test-monitoring-api.mjs [url]
 */

const url = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const endpoint = `${url}/api/monitoring/stats`

console.log('🧪 Testing Monitoring API...')
console.log(`📍 Endpoint: ${endpoint}\n`)

try {
  const response = await fetch(endpoint)
  
  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`)
    process.exit(1)
  }
  
  const data = await response.json()
  
  console.log('✅ API Response:')
  console.log('─'.repeat(60))
  
  // Errors
  console.log('\n📊 ERRORS:')
  console.log(`  Total: ${data.errors.total}`)
  console.log(`  By Agent:`, Object.keys(data.errors.byAgent).length > 0 ? '' : 'None')
  Object.entries(data.errors.byAgent).forEach(([agent, count]) => {
    console.log(`    - ${agent}: ${count}`)
  })
  
  console.log(`  Circuit Breakers: ${data.errors.circuitBreakers.length}`)
  data.errors.circuitBreakers.forEach(cb => {
    const icon = cb.state === 'closed' ? '✅' : cb.state === 'open' ? '🔴' : '🟡'
    console.log(`    ${icon} ${cb.agentName}: ${cb.state.toUpperCase()} (failures: ${cb.failureCount})`)
  })
  
  console.log(`  Error Patterns: ${data.errors.patterns.length}`)
  
  // Performance
  console.log('\n⚡ PERFORMANCE:')
  console.log(`  Total Executions: ${data.performance.totalExecutions}`)
  console.log(`  Avg Execution Time: ${data.performance.avgExecutionTime.toFixed(2)}ms`)
  console.log(`  Success Rate: ${(data.performance.overallSuccessRate * 100).toFixed(1)}%`)
  
  console.log(`\n  Slowest Agents:`)
  data.performance.slowestAgents.slice(0, 3).forEach((agent, i) => {
    console.log(`    ${i+1}. ${agent.name}: ${agent.avgTime.toFixed(2)}ms`)
  })
  
  console.log(`\n  Most Reliable:`)
  data.performance.mostReliableAgents.slice(0, 3).forEach((agent, i) => {
    console.log(`    ${i+1}. ${agent.name}: ${(agent.successRate * 100).toFixed(1)}%`)
  })
  
  console.log(`\n  Bottlenecks: ${data.performance.bottlenecks.length}`)
  data.performance.bottlenecks.forEach(b => {
    console.log(`    ⚠️  ${b.agentName}: ${b.avgTime.toFixed(0)}ms (threshold: ${b.threshold}ms)`)
  })
  
  console.log(`\n  Recent Alerts: ${data.performance.recentAlerts.length}`)
  data.performance.recentAlerts.slice(0, 3).forEach(alert => {
    const icon = alert.type === 'slow_execution' ? '🐌' : '❌'
    console.log(`    ${icon} ${alert.agentName}: ${alert.message}`)
  })
  
  console.log('\n' + '─'.repeat(60))
  console.log('✅ Monitoring system is working!\n')
  
} catch (error) {
  console.error('\n❌ Test Failed:', error.message)
  console.error('\nMake sure:')
  console.error('  1. The server is running')
  console.error('  2. The URL is correct')
  console.error('  3. The monitoring API is deployed\n')
  process.exit(1)
}
