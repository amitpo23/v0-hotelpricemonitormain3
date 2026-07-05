# Decision Agent System - Implementation Guide

## 🎯 Overview

Decision Agent הוא "מנהל הקונצרט" של מערכת ה-Multi-Agent שלנו. הוא אחראי על:

1. **משקולות דינמיות** - קביעת המשקל של כל Agent בהתאם להקשר
2. **ניתוח הקשר** - הבנת הסיטואציה (דחיפות, תקציב, עונתיות)
3. **פתרון קונפליקטים** - טיפול בהמלצות סותרות
4. **המלצות אינטליגנטיות** - החלטה מבוססת-נתונים על שינוי מחירים

## 📁 Files Created

### 1. Core Decision Agent
- **File**: `lib/agents/decision-agent.ts`
- **Purpose**: Central intelligence layer
- **Exports**: 
  - `DecisionAgent` class
  - `AgentOutput`, `DecisionInput`, `DecisionOutput` interfaces

### 2. Enhanced Orchestrator
- **File**: `lib/agents/orchestrator-v2.ts` (updated)
- **Changes**:
  - Imports Decision Agent
  - Collects all agent outputs
  - Runs Decision Agent after data collection
  - Returns decision in `ComprehensiveExternalData`

### 3. Enhanced Prediction Engine
- **File**: `lib/prediction-algorithms.ts` (updated)
- **New Function**: `predictPriceWithDecisionAgent()`
- **Purpose**: Use Decision Agent recommendations instead of static multipliers

### 4. Database Schema
- **File**: `create-decision-agent-tables.sql`
- **Tables**:
  - `agent_execution_logs` - Track all agent executions
  - `agent_accuracy_tracking` - Historical accuracy data
  - `decision_logs` - Every Decision Agent decision
  - `israeli_holidays` - Holiday data with tourism impact
  - `external_data_cache` - Cache for external APIs
  - `autopilot_executions` - Autonomous price changes

## 🔄 How It Works

### Step 1: Data Collection (Orchestrator v2)
```typescript
const data = await orchestrateComprehensiveData(
  hotelId,
  hotelName,
  location,
  targetDates,
  basePrice,
  options
)
```

The orchestrator runs 8 agents in parallel:
1. Events Agent
2. Historical Agent
3. Statistics Agent (CBS data)
4. Trends Agent (Google Trends)
5. Budget Agent
6. Velocity Agent (booking speed)
7. Competitor Agent
8. Holidays Agent

### Step 2: Decision Agent Analysis
```typescript
const decisionAgent = new DecisionAgent()
const decision = await decisionAgent.makeDecision({
  hotelId,
  hotelName,
  location,
  targetDate,
  currentPrice,
  agentOutputs: [...],  // From step 1
  context: {
    daysUntilTarget: 14,
    isHighSeason: true,
    isWeekend: false,
    marketCondition: 'normal',
    competitivePosition: 'average',
    budgetStatus: 'below',
    recentPerformance: 'stable'
  },
  historicalAccuracy: new Map()
})
```

### Step 3: Prediction with Decision Agent
```typescript
const prediction = predictPriceWithDecisionAgent({
  ...predictionInput,
  decisionData: data.decision
})
```

## 📊 Decision Agent Algorithm

### Dynamic Weighting
```typescript
weight = baseWeight 
  × agentConfidence 
  × historicalAccuracy 
  × contextMultiplier
```

**Context Multipliers:**
- **Near-term** (≤7 days): Velocity ×1.3, Competitors ×1.2, Budget ×1.2
- **High season**: Events ×1.4, Holidays ×1.3
- **Budget pressure**: Budget Agent ×1.5
- **Volatile market**: Historical ×1.3, Trends ×1.2

### Conflict Resolution
1. Detect conflicting recommendations (increase vs decrease)
2. Detect large variance in multipliers (>1.5x difference)
3. Use weighted voting based on confidence and context
4. Apply safety overrides (e.g., budget pressure)

### Final Recommendation
```typescript
weightedMultiplier = Σ(agentMultiplier × agentWeight)

if (weightedMultiplier > 1.05) → INCREASE
if (weightedMultiplier < 0.95) → DECREASE
else → MAINTAIN
```

## 💡 Usage Example

### Basic Usage
```typescript
import { orchestrateComprehensiveData } from '@/lib/agents/orchestrator-v2'
import { predictPriceWithDecisionAgent } from '@/lib/prediction-algorithms'

// 1. Collect all agent data
const data = await orchestrateComprehensiveData(
  'hotel-123',
  'Hotel Scarlet',
  'Tel Aviv',
  ['2025-06-01', '2025-06-02'],
  500
)

// 2. Make prediction with Decision Agent
const prediction = predictPriceWithDecisionAgent({
  date: '2025-06-01',
  dayOfWeek: 0,
  isWeekend: false,
  isHoliday: false,
  daysUntilDate: 14,
  currentPrice: 500,
  // ... other inputs
  decisionData: data.decision
})

console.log(prediction)
// {
//   predictedPrice: 575,
//   confidenceScore: 85,
//   demandLevel: 'high',
//   recommendation: 'increase',
//   reasoning: [
//     'Weighted analysis suggests +15% adjustment',
//     'Events Agent: Major conference (weight: 35%)',
//     'Budget Agent: Below target (weight: 25%)'
//   ]
// }
```

### Accessing Decision Details
```typescript
const decision = data.decision

console.log(decision.recommendation)  // 'increase' | 'decrease' | 'maintain'
console.log(decision.suggestedPriceMultiplier)  // 1.15
console.log(decision.confidence)  // 0.85
console.log(decision.reasoning)  // Array of reasons
console.log(decision.warnings)  // Any conflicts or warnings
console.log(decision.dominantFactors)  // Top factors
```

## 🗄️ Database Setup

### Run SQL Script
```bash
# Option 1: Using Supabase CLI
supabase db execute -f create-decision-agent-tables.sql

# Option 2: Using psql
psql $DATABASE_URL -f create-decision-agent-tables.sql

# Option 3: Copy-paste into Supabase SQL Editor
```

### Verify Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'agent_execution_logs',
    'agent_accuracy_tracking',
    'decision_logs',
    'israeli_holidays',
    'external_data_cache',
    'autopilot_executions'
  );
```

## 📈 Monitoring & Analytics

### View Agent Performance
```sql
SELECT * FROM agent_performance_summary;
```

### View Agent Accuracy
```sql
SELECT * FROM agent_accuracy_summary
ORDER BY accuracy_rate DESC;
```

### View Decision Quality
```sql
SELECT * FROM decision_quality_trends
ORDER BY decision_date DESC
LIMIT 30;
```

### Track Autopilot ROI
```sql
SELECT * FROM autopilot_roi_summary
ORDER BY avg_roi DESC;
```

## 🔮 Next Steps (Phase 2-5)

### Phase 2: External Data Agents (Weeks 3-5)
- [ ] CBS Tourism Agent
- [ ] Enhanced Weather Agent
- [ ] News Sentiment Agent
- [ ] Flight Price Agent
- [ ] Social Media Sentiment Agent
- [ ] Market Trends Agent

### Phase 3: Analysis Agents (Weeks 6-8)
- [ ] Year-over-Year Comparison Agent
- [ ] Demand Forecasting Agent
- [ ] Price Elasticity Agent
- [ ] Market Position Agent

### Phase 4: Autopilot System (Weeks 9-10)
- [ ] Autonomous price adjustment
- [ ] Scenario analysis
- [ ] Risk assessment
- [ ] Rollback capability

### Phase 5: Learning System (Weeks 11-12)
- [ ] Feedback loop
- [ ] Agent accuracy tracking
- [ ] Self-improving weights
- [ ] A/B testing framework

## 🎓 Key Concepts

### 1. Dynamic Weighting
משקולות שמשתנות בהתאם למצב:
- **זמן קצר**: נתונים בזמן אמת חשובים יותר
- **עונת שיא**: אירועים וחגים חשובים יותר
- **לחץ תקציבי**: Budget Agent חשוב יותר

### 2. Context Awareness
הבנת ההקשר:
- **דחיפות**: כמה זמן יש עד התאריך?
- **שוק**: יציב, תנודתי, שורי, דובי?
- **מיקום תחרותי**: מובילים, ממוצעים, מפגרים?
- **מצב תקציבי**: מתחת, על המסלול, מעל?

### 3. Conflict Resolution
פתרון סתירות:
- הצבעה משוקללת לפי confidence
- גורמי הקשר מתערבים
- התראות על קונפליקטים משמעותיים

### 4. Explainability
שקיפות והסבר:
- כל החלטה מגיעה עם reasoning
- רואים את הגורמים הדומיננטים
- מקבלים warnings על בעיות

## 🔧 Configuration

### Environment Variables
```bash
# Already exists - no new env vars needed!
# Decision Agent uses existing data sources
```

### Options
```typescript
// In orchestrator-v2.ts
const options: OrchestratorOptions = {
  includeEvents: true,
  includeHistorical: true,
  includeStatistics: true,
  includeTrends: true,
  includeBudget: true,
  includeVelocity: true,
  includeCompetitors: true,
  includeHolidays: true,
  batchOptimization: true,
  realTimeCompetitors: false,
  maxConcurrent: 5
}
```

## 🐛 Debugging

### Check Agent Outputs
```typescript
console.log('[Agent Outputs]', data)
console.log('[Events]', data.events.size, 'events')
console.log('[Historical]', data.historical.size, 'data points')
console.log('[Budget]', data.budget)
console.log('[Velocity]', data.velocity)
```

### Check Decision
```typescript
console.log('[Decision]', data.decision)
console.log('[Recommendation]', data.decision?.recommendation)
console.log('[Confidence]', data.decision?.confidence)
console.log('[Reasoning]', data.decision?.reasoning)
```

### Check Database Logs
```sql
-- Latest decisions
SELECT * FROM decision_logs
ORDER BY created_at DESC
LIMIT 10;

-- Latest agent executions
SELECT * FROM agent_execution_logs
ORDER BY created_at DESC
LIMIT 20;
```

## 📚 References

- **Architecture**: See `PREDICTION_ARCHITECTURE.md`
- **Multi-Agent Guide**: See `MULTI_AGENT_DEBUGGING.md`
- **Orchestrator**: See `lib/agents/orchestrator-v2.ts`
- **Prediction Engine**: See `lib/prediction-algorithms.ts`

---

**Status**: ✅ Phase 1 Complete (Foundation)
**Next**: Phase 2 - External Data Agents
