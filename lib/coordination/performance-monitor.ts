/**
 * Performance Monitor System
 * Tracks and analyzes agent performance metrics
 * Based on awesome-claude-code-subagents patterns
 */

interface AgentMetrics {
  agentName: string
  executionCount: number
  totalExecutionTime: number
  avgExecutionTime: number
  minExecutionTime: number
  maxExecutionTime: number
  successCount: number
  failureCount: number
  successRate: number
  lastExecution?: Date
  recentExecutions: ExecutionRecord[]
}

interface ExecutionRecord {
  timestamp: Date
  durationMs: number
  success: boolean
  result?: any
  error?: string
}

interface PerformanceAlert {
  agentName: string
  alertType: 'slow_execution' | 'high_failure_rate' | 'bottleneck'
  severity: 'warning' | 'critical'
  message: string
  timestamp: Date
}

class PerformanceMonitor {
  private metrics: Map<string, AgentMetrics> = new Map()
  private alerts: PerformanceAlert[] = []
  
  // Performance thresholds
  private readonly slowExecutionThreshold = 10000 // 10 seconds
  private readonly failureRateThreshold = 0.3 // 30% failure rate
  private readonly maxRecentExecutions = 50 // Keep last 50 executions per agent
  
  /**
   * Start tracking an agent execution
   */
  startExecution(agentName: string): () => void {
    const startTime = Date.now()
    
    return () => {
      const duration = Date.now() - startTime
      this.recordExecution(agentName, duration, true)
    }
  }

  /**
   * Track an agent execution with result
   */
  async trackExecution<T>(
    agentName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.recordExecution(agentName, duration, true, result)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordExecution(
        agentName, 
        duration, 
        false, 
        undefined, 
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }

  /**
   * Record execution metrics
   */
  recordExecution(
    agentName: string,
    durationMs: number,
    success: boolean,
    result?: any,
    error?: string
  ): void {
    let metrics = this.metrics.get(agentName)
    
    if (!metrics) {
      metrics = {
        agentName,
        executionCount: 0,
        totalExecutionTime: 0,
        avgExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 1,
        recentExecutions: [],
      }
      this.metrics.set(agentName, metrics)
    }

    // Update counts
    metrics.executionCount++
    if (success) {
      metrics.successCount++
    } else {
      metrics.failureCount++
    }

    // Update timing metrics
    metrics.totalExecutionTime += durationMs
    metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.executionCount
    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, durationMs)
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, durationMs)
    metrics.successRate = metrics.successCount / metrics.executionCount
    metrics.lastExecution = new Date()

    // Add to recent executions
    const execution: ExecutionRecord = {
      timestamp: new Date(),
      durationMs,
      success,
      result: success ? result : undefined,
      error,
    }
    
    metrics.recentExecutions.push(execution)
    
    // Keep only recent executions
    if (metrics.recentExecutions.length > this.maxRecentExecutions) {
      metrics.recentExecutions.shift()
    }

    // Check for performance issues
    this.checkPerformanceAlerts(metrics, durationMs)

    // Log performance
    this.logPerformance(agentName, durationMs, success)
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metrics: AgentMetrics, durationMs: number): void {
    // Slow execution alert
    if (durationMs > this.slowExecutionThreshold) {
      this.addAlert({
        agentName: metrics.agentName,
        alertType: 'slow_execution',
        severity: durationMs > this.slowExecutionThreshold * 2 ? 'critical' : 'warning',
        message: `Execution took ${(durationMs / 1000).toFixed(2)}s (threshold: ${this.slowExecutionThreshold / 1000}s)`,
        timestamp: new Date(),
      })
    }

    // High failure rate alert
    if (metrics.executionCount >= 10 && metrics.successRate < (1 - this.failureRateThreshold)) {
      this.addAlert({
        agentName: metrics.agentName,
        alertType: 'high_failure_rate',
        severity: metrics.successRate < 0.5 ? 'critical' : 'warning',
        message: `Success rate is ${(metrics.successRate * 100).toFixed(1)}% (${metrics.successCount}/${metrics.executionCount})`,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts (same agent + type in last 5 minutes)
    const recentDuplicate = this.alerts.find(
      a => 
        a.agentName === alert.agentName &&
        a.alertType === alert.alertType &&
        Date.now() - a.timestamp.getTime() < 5 * 60 * 1000
    )

    if (!recentDuplicate) {
      this.alerts.push(alert)
      
      const icon = alert.severity === 'critical' ? '🔴' : '🟡'
      console.warn(`${icon} [PerformanceMonitor] ${alert.agentName}: ${alert.message}`)
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts.shift()
      }
    }
  }

  /**
   * Log performance metrics
   */
  private logPerformance(agentName: string, durationMs: number, success: boolean): void {
    const status = success ? '✅' : '❌'
    const time = durationMs > 1000 
      ? `${(durationMs / 1000).toFixed(2)}s` 
      : `${durationMs}ms`
    
    console.log(`${status} [${agentName}] Completed in ${time}`)
  }

  /**
   * Get metrics for specific agent
   */
  getAgentMetrics(agentName: string): AgentMetrics | undefined {
    return this.metrics.get(agentName)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalExecutions: number
    avgExecutionTime: number
    overallSuccessRate: number
    slowestAgents: Array<{ name: string; avgTime: number }>
    mostReliableAgents: Array<{ name: string; successRate: number }>
    bottlenecks: Array<{ name: string; reason: string }>
    recentAlerts: PerformanceAlert[]
  } {
    const allMetrics = this.getAllMetrics()
    
    const totalExecutions = allMetrics.reduce((sum, m) => sum + m.executionCount, 0)
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalExecutionTime, 0)
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successCount, 0)
    
    // Slowest agents
    const slowestAgents = allMetrics
      .filter(m => m.executionCount > 5)
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, 5)
      .map(m => ({ name: m.agentName, avgTime: Math.round(m.avgExecutionTime) }))
    
    // Most reliable agents
    const mostReliableAgents = allMetrics
      .filter(m => m.executionCount > 5)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
      .map(m => ({ name: m.agentName, successRate: m.successRate }))
    
    // Identify bottlenecks
    const bottlenecks: Array<{ name: string; reason: string }> = []
    for (const metrics of allMetrics) {
      if (metrics.avgExecutionTime > this.slowExecutionThreshold) {
        bottlenecks.push({
          name: metrics.agentName,
          reason: `Avg execution time ${(metrics.avgExecutionTime / 1000).toFixed(2)}s`,
        })
      }
      if (metrics.successRate < 0.7 && metrics.executionCount > 10) {
        bottlenecks.push({
          name: metrics.agentName,
          reason: `Low success rate ${(metrics.successRate * 100).toFixed(1)}%`,
        })
      }
    }

    return {
      totalExecutions,
      avgExecutionTime: totalExecutions > 0 ? Math.round(totalTime / totalExecutions) : 0,
      overallSuccessRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 1,
      slowestAgents,
      mostReliableAgents,
      bottlenecks,
      recentAlerts: this.alerts.slice(-10),
    }
  }

  /**
   * Get comparative analysis between agents
   */
  compareAgents(agentNames: string[]): {
    comparison: Array<{
      name: string
      avgTime: number
      successRate: number
      executions: number
    }>
    recommendation: string
  } {
    const comparison = agentNames
      .map(name => {
        const metrics = this.metrics.get(name)
        return metrics ? {
          name,
          avgTime: Math.round(metrics.avgExecutionTime),
          successRate: metrics.successRate,
          executions: metrics.executionCount,
        } : null
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
    
    // Generate recommendation
    let recommendation = ''
    if (comparison.length > 1) {
      const fastest = comparison.reduce((prev, curr) => 
        prev.avgTime < curr.avgTime ? prev : curr
      )
      const slowest = comparison.reduce((prev, curr) => 
        prev.avgTime > curr.avgTime ? prev : curr
      )
      
      if (slowest.avgTime > fastest.avgTime * 2) {
        recommendation = `${slowest.name} is ${Math.round(slowest.avgTime / fastest.avgTime)}x slower than ${fastest.name}. Consider optimization.`
      }
    }

    return { comparison, recommendation }
  }

  /**
   * Reset metrics for an agent
   */
  resetAgentMetrics(agentName: string): void {
    this.metrics.delete(agentName)
    console.log(`🔄 [PerformanceMonitor] Metrics reset for ${agentName}`)
  }

  /**
   * Clear old alerts
   */
  cleanupAlerts(olderThanMinutes: number = 60): void {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff)
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()
