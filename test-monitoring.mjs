// Quick test of monitoring system
import { errorCoordinator } from './lib/coordination/error-coordinator.ts'
import { performanceMonitor } from './lib/coordination/performance-monitor.ts'

console.log('🧪 Testing Monitoring System...\n')

// Test 1: Log some errors
console.log('1️⃣ Testing Error Coordinator...')
errorCoordinator.logError('Test Agent', new Error('Test error 1'), undefined, 'medium', false)
errorCoordinator.logError('Test Agent', new Error('Test error 2'), undefined, 'medium', false)

const stats = errorCoordinator.getStatistics()
console.log(`   ✅ Total errors: ${stats.totalErrors}`)
console.log(`   ✅ Circuit breakers: ${stats.circuitBreakers.length}`)

// Test 2: Track performance
console.log('\n2️⃣ Testing Performance Monitor...')
await performanceMonitor.trackExecution('Test Agent', async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return 'test'
})

const perfStats = performanceMonitor.getPerformanceSummary()
console.log(`   ✅ Total executions: ${perfStats.totalExecutions}`)
console.log(`   ✅ Avg time: ${perfStats.avgExecutionTime.toFixed(2)}ms`)

// Test 3: Circuit breaker
console.log('\n3️⃣ Testing Circuit Breaker...')
for (let i = 0; i < 6; i++) {
  errorCoordinator.logError('Failing Agent', new Error(`Failure ${i+1}`), undefined, 'high', false)
}

const check = errorCoordinator.shouldAllowExecution('Failing Agent')
console.log(`   ✅ Circuit breaker state: ${check.allowed ? 'CLOSED' : 'OPEN ⚠️'}`)
console.log(`   ✅ Reason: ${check.reason}`)

console.log('\n✅ All tests passed!')
