/**
 * Error Coordinator System
 * Tracks, correlates, and manages errors across all agents
 * Based on awesome-claude-code-subagents patterns
 */

interface AgentError {
  agentName: string
  timestamp: Date
  errorType: string
  errorMessage: string
  stack?: string
  context?: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  recovered: boolean
}

interface ErrorPattern {
  pattern: string
  count: number
  firstSeen: Date
  lastSeen: Date
  affectedAgents: string[]
  suggestedFix?: string
}

interface CircuitBreakerState {
  agentName: string
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailure?: Date
  nextRetryAt?: Date
}

class ErrorCoordinator {
  private errors: AgentError[] = []
  private patterns: Map<string, ErrorPattern> = new Map()
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  
  // Configuration
  private readonly maxErrors = 1000 // Keep last 1000 errors
  private readonly patternThreshold = 3 // Min occurrences to be a pattern
  private readonly circuitBreakerThreshold = 5 // Failures before opening
  private readonly circuitBreakerTimeout = 60000 // 1 minute cooldown
  
  /**
   * Log an error from an agent
   */
  logError(
    agentName: string,
    error: Error | string,
    context?: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recovered: boolean = false
  ): void {
    const errorObj: AgentError = {
      agentName,
      timestamp: new Date(),
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      severity,
      recovered,
    }

    // Add to errors list
    this.errors.push(errorObj)
    
    // Maintain max size
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    // Update circuit breaker
    this.updateCircuitBreaker(agentName, !recovered)

    // Detect patterns
    this.detectPattern(errorObj)

    // Log based on severity
    this.logBySeverity(errorObj)
  }

  /**
   * Update circuit breaker state for an agent
   */
  private updateCircuitBreaker(agentName: string, failed: boolean): void {
    let breaker = this.circuitBreakers.get(agentName)
    
    if (!breaker) {
      breaker = {
        agentName,
        state: 'closed',
        failureCount: 0,
      }
      this.circuitBreakers.set(agentName, breaker)
    }

    if (failed) {
      breaker.failureCount++
      breaker.lastFailure = new Date()

      // Open circuit if threshold reached
      if (breaker.failureCount >= this.circuitBreakerThreshold && breaker.state === 'closed') {
        breaker.state = 'open'
        breaker.nextRetryAt = new Date(Date.now() + this.circuitBreakerTimeout)
        console.warn(`🔴 [ErrorCoordinator] Circuit breaker OPEN for ${agentName}`)
      }
    } else {
      // Success - reset or close circuit
      if (breaker.state === 'half-open') {
        breaker.state = 'closed'
        breaker.failureCount = 0
        console.log(`🟢 [ErrorCoordinator] Circuit breaker CLOSED for ${agentName}`)
      } else if (breaker.state === 'closed') {
        // Decay failure count on success
        breaker.failureCount = Math.max(0, breaker.failureCount - 1)
      }
    }
  }

  /**
   * Check if agent should be allowed to execute
   */
  shouldAllowExecution(agentName: string): { allowed: boolean; reason?: string } {
    const breaker = this.circuitBreakers.get(agentName)
    
    if (!breaker || breaker.state === 'closed') {
      return { allowed: true }
    }

    if (breaker.state === 'open') {
      // Check if cooldown period has passed
      if (breaker.nextRetryAt && Date.now() >= breaker.nextRetryAt.getTime()) {
        breaker.state = 'half-open'
        console.log(`🟡 [ErrorCoordinator] Circuit breaker HALF-OPEN for ${agentName}`)
        return { allowed: true }
      }
      return { 
        allowed: false, 
        reason: `Circuit breaker open until ${breaker.nextRetryAt?.toLocaleTimeString()}` 
      }
    }

    // Half-open - allow one attempt
    return { allowed: true }
  }

  /**
   * Detect error patterns
   */
  private detectPattern(error: AgentError): void {
    // Create pattern key from error type and key message parts
    const patternKey = `${error.errorType}:${this.extractKeywords(error.errorMessage)}`
    
    let pattern = this.patterns.get(patternKey)
    
    if (!pattern) {
      pattern = {
        pattern: patternKey,
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        affectedAgents: [],
      }
      this.patterns.set(patternKey, pattern)
    }

    pattern.count++
    pattern.lastSeen = error.timestamp
    
    if (!pattern.affectedAgents.includes(error.agentName)) {
      pattern.affectedAgents.push(error.agentName)
    }

    // Suggest fixes for common patterns
    if (pattern.count >= this.patternThreshold && !pattern.suggestedFix) {
      pattern.suggestedFix = this.suggestFix(error)
      console.warn(`🔍 [ErrorCoordinator] Pattern detected: ${patternKey} (${pattern.count} occurrences)`)
      if (pattern.suggestedFix) {
        console.log(`💡 [ErrorCoordinator] Suggested fix: ${pattern.suggestedFix}`)
      }
    }
  }

  /**
   * Extract keywords from error message for pattern matching
   */
  private extractKeywords(message: string): string {
    // Remove specific values (numbers, IDs, timestamps) to generalize
    return message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')
      .slice(0, 100) // First 100 chars
  }

  /**
   * Suggest fix based on error pattern
   */
  private suggestFix(error: AgentError): string | undefined {
    const msg = error.errorMessage.toLowerCase()
    
    if (msg.includes('timeout')) {
      return 'Consider increasing timeout or implementing retry with exponential backoff'
    }
    if (msg.includes('connection refused') || msg.includes('econnrefused')) {
      return 'Check if service is running and URL is correct. Consider adding circuit breaker.'
    }
    if (msg.includes('rate limit')) {
      return 'Implement rate limiting with backoff strategy'
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'Verify resource exists or implement fallback mechanism'
    }
    if (msg.includes('unauthorized') || msg.includes('403')) {
      return 'Check API credentials and permissions'
    }
    
    return undefined
  }

  /**
   * Log based on severity
   */
  private logBySeverity(error: AgentError): void {
    const prefix = `[${error.agentName}]`
    const suffix = error.recovered ? '(recovered)' : ''
    
    switch (error.severity) {
      case 'critical':
        console.error(`🔴 ${prefix} CRITICAL: ${error.errorMessage} ${suffix}`)
        break
      case 'high':
        console.error(`🟠 ${prefix} HIGH: ${error.errorMessage} ${suffix}`)
        break
      case 'medium':
        console.warn(`🟡 ${prefix} MEDIUM: ${error.errorMessage} ${suffix}`)
        break
      case 'low':
        console.log(`🟢 ${prefix} LOW: ${error.errorMessage} ${suffix}`)
        break
    }
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number
    errorsByAgent: Record<string, number>
    errorsBySeverity: Record<string, number>
    patterns: ErrorPattern[]
    circuitBreakers: CircuitBreakerState[]
    recentErrors: AgentError[]
  } {
    const errorsByAgent: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    for (const error of this.errors) {
      errorsByAgent[error.agentName] = (errorsByAgent[error.agentName] || 0) + 1
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
    }

    return {
      totalErrors: this.errors.length,
      errorsByAgent,
      errorsBySeverity,
      patterns: Array.from(this.patterns.values())
        .filter(p => p.count >= this.patternThreshold)
        .sort((a, b) => b.count - a.count),
      circuitBreakers: Array.from(this.circuitBreakers.values()),
      recentErrors: this.errors.slice(-20), // Last 20 errors
    }
  }

  /**
   * Get errors for specific agent
   */
  getAgentErrors(agentName: string, limit: number = 10): AgentError[] {
    return this.errors
      .filter(e => e.agentName === agentName)
      .slice(-limit)
  }

  /**
   * Clear old errors (cleanup)
   */
  cleanup(olderThanMinutes: number = 60): void {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
    this.errors = this.errors.filter(e => e.timestamp > cutoff)
    
    // Clean old patterns
    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < cutoff) {
        this.patterns.delete(key)
      }
    }
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetCircuitBreaker(agentName: string): void {
    const breaker = this.circuitBreakers.get(agentName)
    if (breaker) {
      breaker.state = 'closed'
      breaker.failureCount = 0
      breaker.lastFailure = undefined
      breaker.nextRetryAt = undefined
      console.log(`🔄 [ErrorCoordinator] Circuit breaker reset for ${agentName}`)
    }
  }
}

// Singleton instance
export const errorCoordinator = new ErrorCoordinator()
