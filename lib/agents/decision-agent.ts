/**
 * Decision Agent - "מנהל הקונצרט"
 * 
 * תפקיד: לנתח את כל הנתונים מכל ה-Agents ולקבוע:
 * 1. משקולות דינמיות (Dynamic Weighting)
 * 2. ניתוח הקשר (Context Analysis) 
 * 3. פתרון קונפליקטים (Conflict Resolution)
 * 4. המלצות פעולה (Action Recommendations)
 * 
 * זהו ה-Agent המרכזי שמשקלל את כל המידע ומחליט מה לעשות.
 */

// ===== INTERFACES =====

export interface AgentOutput {
  agentName: string
  recommendation: 'increase' | 'decrease' | 'maintain'
  confidence: number  // 0-1
  suggestedMultiplier: number  // e.g., 1.15 = +15%
  reasoning: string[]
  dataPoints: any
}

export interface DecisionContext {
  daysUntilTarget: number
  isHighSeason: boolean
  isWeekend: boolean
  marketCondition: 'volatile' | 'normal' | 'stable'
  competitivePosition: 'leading' | 'average' | 'lagging'
  budgetStatus: 'below' | 'on_track' | 'above'
  recentPerformance: 'improving' | 'stable' | 'declining'
}

export interface HistoricalAccuracy {
  agentName: string
  accuracy: number  // 0-1 (1 = 100% accurate)
  totalPredictions: number
  successRate: number
  avgError: number
  lastUpdated: Date
}

export interface DecisionInput {
  hotelId: string
  hotelName: string
  location: string
  targetDate: string
  currentPrice: number
  agentOutputs: AgentOutput[]
  context: DecisionContext
  historicalAccuracy: Map<string, HistoricalAccuracy>
}

export interface DominantFactor {
  agentName: string
  weight: number
  impact: number
  reasoning: string
}

export interface DecisionOutput {
  recommendation: 'increase' | 'decrease' | 'maintain'
  suggestedPrice: number
  confidence: number  // 0-1
  reasoning: string[]
  warnings: string[]
  dominantFactors: DominantFactor[]
  
  // Decision metadata
  processingTime: number
  timestamp: string
  version: string
}

// ===== DECISION AGENT CLASS =====

export class DecisionAgent {
  private readonly version = '1.0.0'
  
  /**
   * Main decision function - analyzes all agent outputs and makes a unified decision
   */
  async makeDecision(input: DecisionInput): Promise<DecisionOutput> {
    const startTime = Date.now()
    
    console.log('🎯 [Decision Agent] Starting analysis...')
    console.log(`   Analyzing ${input.agentOutputs.length} agent outputs`)
    
    // Step 1: Calculate dynamic weights
    const weights = this.calculateDynamicWeights(input)
    
    // Step 2: Detect conflicts
    const conflicts = this.detectConflicts(input.agentOutputs)
    
    // Step 3: Generate recommendation
    const { recommendation, suggestedPrice, reasoning, warnings } = 
      this.generateRecommendation(input, weights, conflicts)
    
    // Step 4: Identify dominant factors
    const dominantFactors = this.identifyDominantFactors(input, weights)
    
    // Step 5: Calculate confidence
    const confidence = this.calculateConfidence(input, weights, conflicts)
    
    const processingTime = Date.now() - startTime
    
    return {
      recommendation,
      suggestedPrice,
      confidence,
      reasoning,
      warnings,
      dominantFactors,
      processingTime,
      timestamp: new Date().toISOString(),
      version: this.version
    }
  }
  
  /**
   * Calculate dynamic weights for each agent
   */
  private calculateDynamicWeights(input: DecisionInput): Map<string, number> {
    const weights = new Map<string, number>()
    const { context, historicalAccuracy, agentOutputs } = input
    
    for (const agent of agentOutputs) {
      let weight = 1.0
      
      // 1. Base weight from agent confidence
      weight *= agent.confidence
      
      // 2. Adjust by historical accuracy (if available)
      const accuracy = historicalAccuracy.get(agent.agentName)
      if (accuracy) {
        weight *= accuracy.accuracy
      }
      
      // 3. Context-based adjustments
      
      // Near-term: favor real-time data
      if (context.daysUntilTarget <= 7) {
        if (agent.agentName === 'Velocity Agent') weight *= 1.3
        if (agent.agentName === 'Competitor Agent') weight *= 1.2
        if (agent.agentName === 'Budget Agent') weight *= 1.2
      }
      
      // High season: events and holidays matter more
      if (context.isHighSeason) {
        if (agent.agentName === 'Events Agent') weight *= 1.4
        if (agent.agentName === 'Holidays Agent') weight *= 1.3
      }
      
      // Budget pressure: budget agent gets more weight
      if (context.budgetStatus === 'below') {
        if (agent.agentName === 'Budget Agent') weight *= 1.5
      }
      
      // Volatile market: favor historical and trends
      if (context.marketCondition === 'volatile') {
        if (agent.agentName === 'Historical Agent') weight *= 1.3
        if (agent.agentName === 'Trends Agent') weight *= 1.2
      }
      
      weights.set(agent.agentName, weight)
    }
    
    // Normalize weights to sum to 1.0
    const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0)
    if (totalWeight > 0) {
      for (const [name, weight] of weights.entries()) {
        weights.set(name, weight / totalWeight)
      }
    }
    
    return weights
  }
  
  /**
   * Detect conflicts between agents
   */
  private detectConflicts(agents: AgentOutput[]): string[] {
    const conflicts: string[] = []
    
    const increases = agents.filter(a => a.recommendation === 'increase')
    const decreases = agents.filter(a => a.recommendation === 'decrease')
    
    if (increases.length > 0 && decreases.length > 0) {
      conflicts.push(`Conflicting recommendations: ${increases.length} agents suggest increase, ${decreases.length} suggest decrease`)
    }
    
    // Check for extreme multiplier differences
    const multipliers = agents.map(a => a.suggestedMultiplier)
    const maxMultiplier = Math.max(...multipliers)
    const minMultiplier = Math.min(...multipliers)
    
    if (maxMultiplier / minMultiplier > 1.5) {
      conflicts.push(`Large variance in suggested multipliers: ${minMultiplier.toFixed(2)}x to ${maxMultiplier.toFixed(2)}x`)
    }
    
    return conflicts
  }
  
  /**
   * Generate final recommendation
   */
  private generateRecommendation(
    input: DecisionInput,
    weights: Map<string, number>,
    conflicts: string[]
  ): {
    recommendation: 'increase' | 'decrease' | 'maintain'
    suggestedPrice: number
    reasoning: string[]
    warnings: string[]
  } {
    const { agentOutputs, currentPrice, context } = input
    const reasoning: string[] = []
    const warnings: string[] = [...conflicts]
    
    // Calculate weighted average multiplier
    let weightedMultiplier = 0
    for (const agent of agentOutputs) {
      const weight = weights.get(agent.agentName) || 0
      weightedMultiplier += agent.suggestedMultiplier * weight
      
      if (weight > 0.2) {  // Significant weight
        reasoning.push(`${agent.agentName}: ${agent.reasoning[0]} (weight: ${(weight * 100).toFixed(0)}%)`)
      }
    }
    
    // Apply context adjustments
    if (context.budgetStatus === 'below' && weightedMultiplier < 1.0) {
      reasoning.push('⚠️  Budget pressure overrides decrease recommendation')
      weightedMultiplier = Math.max(weightedMultiplier, 1.0)
    }
    
    if (context.daysUntilTarget <= 3 && weightedMultiplier > 1.0) {
      reasoning.push('🚀 Last-minute premium pricing applied')
      weightedMultiplier *= 1.05
    }
    
    // Determine recommendation
    let recommendation: 'increase' | 'decrease' | 'maintain'
    if (weightedMultiplier > 1.05) {
      recommendation = 'increase'
    } else if (weightedMultiplier < 0.95) {
      recommendation = 'decrease'
    } else {
      recommendation = 'maintain'
    }
    
    const suggestedPrice = Math.round(currentPrice * weightedMultiplier)
    
    // Add context reasoning
    reasoning.unshift(`Weighted analysis of ${agentOutputs.length} agents suggests ${(weightedMultiplier - 1) * 100 > 0 ? '+' : ''}${((weightedMultiplier - 1) * 100).toFixed(1)}% price adjustment`)
    
    return { recommendation, suggestedPrice, reasoning, warnings }
  }
  
  /**
   * Identify dominant factors
   */
  private identifyDominantFactors(
    input: DecisionInput,
    weights: Map<string, number>
  ): DominantFactor[] {
    const factors: DominantFactor[] = []
    
    for (const agent of input.agentOutputs) {
      const weight = weights.get(agent.agentName) || 0
      factors.push({
        agentName: agent.agentName,
        weight,
        impact: agent.suggestedMultiplier,
        reasoning: agent.reasoning[0] || 'No specific reasoning provided'
      })
    }
    
    // Sort by weight (highest first)
    factors.sort((a, b) => b.weight - a.weight)
    
    // Return top 5
    return factors.slice(0, 5)
  }
  
  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    input: DecisionInput,
    weights: Map<string, number>,
    conflicts: string[]
  ): number {
    let confidence = 0.7  // Base confidence
    
    // Add confidence based on data quality
    const avgAgentConfidence = input.agentOutputs
      .reduce((sum, a) => sum + a.confidence, 0) / input.agentOutputs.length
    confidence += avgAgentConfidence * 0.2
    
    // Reduce confidence for conflicts
    confidence -= conflicts.length * 0.05
    
    // Increase confidence for consensus
    const recommendations = input.agentOutputs.map(a => a.recommendation)
    const mostCommon = recommendations.sort((a, b) =>
      recommendations.filter(r => r === a).length - recommendations.filter(r => r === b).length
    ).pop()
    const consensusRatio = recommendations.filter(r => r === mostCommon).length / recommendations.length
    confidence += (consensusRatio - 0.5) * 0.2
    
    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence))
  }
}
