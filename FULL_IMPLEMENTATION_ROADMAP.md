# Multi-Agent System - Complete Implementation Roadmap

## 🎯 Vision: Intelligent, Self-Learning Pricing System

Transform from 8 basic agents to 20+ intelligent agents with autonomous decision-making.

---

## ✅ Phase 1: Foundation (COMPLETED)

### Week 1-2: Decision Agent Core
**Status**: ✅ **COMPLETE**

#### Completed:
- [x] Decision Agent implementation (`decision-agent.ts`)
- [x] Dynamic weight calculation
- [x] Conflict detection and resolution
- [x] Context-aware decision making
- [x] Enhanced orchestrator integration
- [x] Enhanced prediction engine
- [x] Database schema design (6 tables, 4 views)
- [x] Complete documentation

#### Files Created:
1. `lib/agents/decision-agent.ts` (320 lines)
2. `create-decision-agent-tables.sql` (350 lines)
3. `DECISION_AGENT_GUIDE.md` (400+ lines)
4. `PHASE_1_COMPLETE.md` (300+ lines)

#### Files Modified:
1. `lib/agents/orchestrator-v2.ts` (+150 lines)
2. `lib/prediction-algorithms.ts` (+100 lines)

**Next**: Deploy database tables and test with real data

---

## 🔄 Phase 2: External Data Agents (Weeks 3-5)

### Goal: Expand data sources from external APIs

### Week 3: Tourism & Weather Data

#### 2.1 CBS Tourism Agent 📊
**Priority**: HIGH | **Cost**: FREE

```typescript
// File: lib/agents/cbs-tourism-agent.ts

export interface CBSTourismData {
  hotelOccupancyRate: number      // National average
  touristArrivals: number          // Monthly arrivals
  avgNightlyStay: number           // Average nights
  seasonalIndex: number            // 0-2 (1=normal)
  growthRate: number               // YoY growth %
}

export async function analyzeCBSTourism(
  location: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Fetch CBS API data
  // 2. Calculate seasonal index
  // 3. Analyze growth trends
  // 4. Return weighted recommendation
}
```

**Data Source**: 
- CBS Open Data API (Free)
- URL: `https://data.gov.il/dataset/cbs-tourism`
- Updates: Monthly

**Implementation Steps**:
1. [ ] Create CBS API client
2. [ ] Implement data fetching
3. [ ] Build caching layer
4. [ ] Calculate tourism impact score
5. [ ] Integrate with orchestrator
6. [ ] Add to decision agent weights

**Expected Impact**: +5-8% prediction accuracy for seasonal trends

---

#### 2.2 Enhanced Weather Agent 🌤️
**Priority**: HIGH | **Cost**: $0-10/month

```typescript
// File: lib/agents/weather-agent-v2.ts

export interface WeatherForecast {
  temperature: number
  precipitation: number
  windSpeed: number
  conditions: string
  touristScore: number       // 0-100 (100=perfect)
  impactMultiplier: number   // 0.8-1.3
  confidence: number
}

export async function getWeatherImpact(
  location: string,
  dates: Date[]
): Promise<AgentOutput> {
  // 1. Get 14-day forecast
  // 2. Calculate tourist score
  // 3. Compare to historical weather
  // 4. Return impact multiplier
}
```

**Data Source**:
- OpenWeatherMap API
- Free tier: 1000 calls/day
- Upgrade: $10/month for 14-day forecast

**Factors**:
- Temperature (ideal: 20-28°C)
- Precipitation (avoid rain)
- Wind (avoid strong winds)
- Overall conditions (sunny > cloudy > rainy)

**Implementation Steps**:
1. [ ] Upgrade weather API
2. [ ] Implement 14-day forecast
3. [ ] Build tourist score algorithm
4. [ ] Add weather-price correlation analysis
5. [ ] Integrate with decision agent

**Expected Impact**: +3-5% accuracy for weather-sensitive destinations

---

### Week 4: News & Sentiment Analysis

#### 2.3 News Sentiment Agent 📰
**Priority**: MEDIUM | **Cost**: FREE (100 req/day)

```typescript
// File: lib/agents/news-sentiment-agent.ts

export interface NewsSentiment {
  overallSentiment: number      // -1 to 1
  newsCount: number              // Articles found
  topKeywords: string[]
  majorEvents: string[]
  touristicImpact: number        // 0.7-1.3
  confidence: number
}

export async function analyzeNewsSentiment(
  location: string,
  dateRange: [Date, Date]
): Promise<AgentOutput> {
  // 1. Search news about location
  // 2. Analyze sentiment (positive/negative)
  // 3. Identify major events
  // 4. Calculate tourism impact
}
```

**Data Sources**:
- NewsAPI.org (Free: 100 req/day)
- Alternative: RSS feeds (Free)

**Search Queries**:
- "Tel Aviv tourism"
- "Israel travel"
- "[Location] events"
- "[Location] safety"

**Sentiment Categories**:
- **Positive** (+20%): Major events, festivals, good news
- **Neutral** (0%): Regular coverage
- **Negative** (-20%): Safety concerns, conflicts, strikes

**Implementation Steps**:
1. [ ] Integrate NewsAPI
2. [ ] Build sentiment analyzer (GPT-4 or local)
3. [ ] Identify tourism-relevant news
4. [ ] Cache news data (24h TTL)
5. [ ] Add to orchestrator

**Expected Impact**: +2-4% accuracy for event-driven changes

---

#### 2.4 Social Media Sentiment Agent 📱
**Priority**: MEDIUM | **Cost**: FREE

```typescript
// File: lib/agents/social-sentiment-agent.ts

export interface SocialSentiment {
  redditMentions: number
  twitterBuzz: number           // Tweet volume
  instagramHashtags: number
  overallBuzz: number           // 0-100
  sentiment: number             // -1 to 1
  trendingTopics: string[]
  impactMultiplier: number
}

export async function analyzeSocialSentiment(
  location: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Check Reddit mentions
  // 2. Check Twitter/X activity
  // 3. Check Instagram hashtags
  // 4. Calculate buzz score
}
```

**Data Sources**:
- Reddit API (Free)
- Twitter API Basic (Free tier available)
- Instagram hashtag scraping (Free)

**Metrics**:
- Mention volume (comparing to baseline)
- Sentiment (positive/negative ratio)
- Trending topics
- User engagement

**Implementation Steps**:
1. [ ] Integrate Reddit API
2. [ ] Integrate Twitter API (basic)
3. [ ] Scrape Instagram hashtags
4. [ ] Build buzz score algorithm
5. [ ] Add to orchestrator

**Expected Impact**: +2-3% accuracy for viral trends

---

### Week 5: Market & Flight Data

#### 2.5 Flight Price Agent ✈️
**Priority**: MEDIUM | **Cost**: FREE tier available

```typescript
// File: lib/agents/flight-price-agent.ts

export interface FlightPriceData {
  avgFlightPrice: number
  priceChange: number           // vs 30 days ago
  availability: number          // 0-100
  popularityScore: number       // Booking volume
  impactMultiplier: number
}

export async function analyzeFlightPrices(
  location: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Get flight prices to location
  // 2. Compare to historical prices
  // 3. Check availability
  // 4. Calculate demand proxy
}
```

**Data Sources**:
- Skyscanner API (Free tier available)
- Alternative: Google Flights scraping
- Fallback: IATA data

**Logic**:
- **High flight prices** → High demand → Increase hotel prices
- **Low flight prices** → High availability → Lower demand
- **Price trend** → Leading indicator for tourism

**Implementation Steps**:
1. [ ] Integrate Skyscanner API
2. [ ] Fetch major routes to location
3. [ ] Calculate demand proxy
4. [ ] Add to orchestrator

**Expected Impact**: +3-5% accuracy for international tourism

---

#### 2.6 Market Trends Agent 📈
**Priority**: HIGH | **Cost**: FREE (using existing Google Trends)

```typescript
// File: lib/agents/market-trends-agent-v2.ts

export interface MarketTrends {
  googleTrendsScore: number     // Already have
  bookingComTrends: number      // NEW
  expediaTrends: number         // NEW
  airbnbDemand: number          // NEW
  overallMarketHeat: number     // 0-100
  impactMultiplier: number
}

export async function analyzeMarketTrends(
  location: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Get Google Trends (existing)
  // 2. Scrape Booking.com trends
  // 3. Scrape Expedia trends
  // 4. Check Airbnb availability
  // 5. Calculate market heat
}
```

**Data Sources**:
- Google Trends API (Free - already have)
- Booking.com public data (Scraping)
- Expedia trends (Scraping)
- Airbnb API (Limited free tier)

**Implementation Steps**:
1. [ ] Enhance existing trends agent
2. [ ] Add Booking.com scraper
3. [ ] Add Expedia scraper
4. [ ] Integrate with decision agent

**Expected Impact**: +5-7% accuracy for market demand

---

## 📊 Phase 3: Analysis Agents (Weeks 6-8)

### Goal: Add intelligent analysis on top of raw data

### Week 6: Historical Analysis

#### 3.1 Year-over-Year Comparison Agent 📅
**Priority**: HIGH | **Cost**: $0 (uses existing DB)

```typescript
// File: lib/agents/yoy-comparison-agent.ts

export interface YoYAnalysis {
  lastYearPrice: number
  priceChangePercent: number
  lastYearOccupancy: number
  occupancyTrend: number
  seasonalityIndex: number      // 0.5-2.0
  recommendation: 'increase' | 'decrease' | 'maintain'
  confidence: number
}

export async function analyzeYearOverYear(
  hotelId: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Get same date last year
  // 2. Get same week last year
  // 3. Calculate trends
  // 4. Adjust for market changes
}
```

**Implementation Steps**:
1. [ ] Query historical prices (same date last year)
2. [ ] Query historical occupancy
3. [ ] Calculate seasonal index
4. [ ] Adjust for market inflation
5. [ ] Integrate with decision agent

**Expected Impact**: +8-10% accuracy with historical data

---

#### 3.2 Demand Forecasting Agent 🔮
**Priority**: HIGH | **Cost**: $0 (computational)

```typescript
// File: lib/agents/demand-forecast-agent.ts

export interface DemandForecast {
  expectedOccupancy: number     // 0-100%
  demandLevel: 'low' | 'medium' | 'high' | 'very_high'
  confidenceInterval: [number, number]
  pricingPower: number          // How much can we increase?
  optimalPrice: number
  confidence: number
}

export async function forecastDemand(
  hotelId: string,
  targetDate: Date,
  allAgentData: any
): Promise<AgentOutput> {
  // 1. Combine all agent signals
  // 2. Apply ML model (simple linear or tree)
  // 3. Calculate expected occupancy
  // 4. Determine pricing power
}
```

**Model**: Simple weighted model to start, can upgrade to ML later

**Inputs**:
- Historical occupancy patterns
- Events impact
- Weather forecast
- Booking velocity
- Competitor prices
- Market trends

**Implementation Steps**:
1. [ ] Build demand model
2. [ ] Train on historical data
3. [ ] Implement forecasting
4. [ ] Calculate pricing power
5. [ ] Integrate with decision agent

**Expected Impact**: +10-15% accuracy (major improvement)

---

### Week 7-8: Competitive Analysis

#### 3.3 Price Elasticity Agent 💰
**Priority**: MEDIUM | **Cost**: $0 (computational)

```typescript
// File: lib/agents/price-elasticity-agent.ts

export interface PriceElasticity {
  elasticity: number            // -2 to 0 (typical: -1.5)
  optimalPricePoint: number
  revenueMaximizingPrice: number
  occupancyMaximizingPrice: number
  currentPricePosition: 'too_low' | 'optimal' | 'too_high'
  confidence: number
}

export async function analyzePriceElasticity(
  hotelId: string,
  targetDate: Date
): Promise<AgentOutput> {
  // 1. Get historical price-occupancy relationship
  // 2. Calculate elasticity coefficient
  // 3. Find optimal price point
  // 4. Recommend adjustment
}
```

**Formula**:
```
elasticity = (% change in occupancy) / (% change in price)

optimal_price = marginal_cost / (1 + 1/elasticity)
```

**Implementation Steps**:
1. [ ] Collect price-occupancy pairs
2. [ ] Calculate elasticity
3. [ ] Build optimization model
4. [ ] Recommend optimal pricing
5. [ ] Integrate with decision agent

**Expected Impact**: +5-8% revenue optimization

---

#### 3.4 Market Position Agent 🎯
**Priority**: MEDIUM | **Cost**: $0 (uses existing data)

```typescript
// File: lib/agents/market-position-agent.ts

export interface MarketPosition {
  ourPrice: number
  marketAverage: number
  marketMedian: number
  ourRanking: number            // 1-10 (1=cheapest)
  competitiveAdvantage: number  // -1 to 1
  priceGap: number             // vs closest competitor
  marketShare: number          // Estimated %
  recommendation: string
  confidence: number
}

export async function analyzeMarketPosition(
  hotelId: string,
  targetDate: Date,
  competitorData: any
): Promise<AgentOutput> {
  // 1. Get all competitor prices
  // 2. Calculate our position
  // 3. Identify price gaps
  // 4. Recommend positioning strategy
}
```

**Strategies**:
- **Premium positioning**: Price 10-20% above average (if quality supports it)
- **Value positioning**: Price 5-10% below average (high volume)
- **Match market**: Price at average (safe play)

**Implementation Steps**:
1. [ ] Aggregate competitor data
2. [ ] Calculate market statistics
3. [ ] Determine optimal position
4. [ ] Recommend strategy
5. [ ] Integrate with decision agent

**Expected Impact**: +3-5% competitive advantage

---

## 🤖 Phase 4: Autopilot System (Weeks 9-10)

### Goal: Autonomous price optimization with safeguards

### Week 9: Autopilot Core

#### 4.1 Autopilot Engine 🚀
**Priority**: HIGH | **Cost**: $0

```typescript
// File: lib/autopilot/autopilot-engine.ts

export interface AutopilotConfig {
  enabled: boolean
  maxPriceChange: number        // Max % change per day
  minConfidence: number         // Min confidence to act
  dryRun: boolean              // Test mode
  approvalRequired: boolean     // Need human approval?
  hotelIds: string[]           // Which hotels
}

export interface AutopilotDecision {
  shouldAct: boolean
  action: 'increase' | 'decrease' | 'maintain'
  oldPrice: number
  newPrice: number
  confidence: number
  reasoning: string[]
  safeguards: string[]         // Why it's safe
  risks: string[]              // What could go wrong
}

export async function runAutopilot(
  hotelId: string,
  targetDate: Date,
  config: AutopilotConfig
): Promise<AutopilotDecision> {
  // 1. Get Decision Agent recommendation
  // 2. Check safeguards
  // 3. Validate confidence threshold
  // 4. Calculate price change
  // 5. Execute or queue for approval
}
```

**Safeguards**:
1. Maximum price change limit (+/- 20% per day)
2. Minimum confidence threshold (> 80%)
3. Budget guardrails (don't exceed budget)
4. Competitive boundaries (stay within market range)
5. Rollback capability (can undo within 24h)

**Implementation Steps**:
1. [ ] Build autopilot engine
2. [ ] Implement safeguards
3. [ ] Add approval workflow
4. [ ] Create rollback mechanism
5. [ ] Test in dry-run mode

---

#### 4.2 Scenario Analysis 🎭
**Priority**: MEDIUM | **Cost**: $0

```typescript
// File: lib/autopilot/scenario-analyzer.ts

export interface Scenario {
  name: string
  priceChange: number
  expectedOccupancy: number
  expectedRevenue: number
  riskLevel: 'low' | 'medium' | 'high'
  probability: number
}

export async function analyzeScenarios(
  hotelId: string,
  targetDate: Date,
  currentPrice: number
): Promise<Scenario[]> {
  // Test multiple price points
  // scenarios = [
  //   { name: 'Aggressive +20%', price: 600, ... },
  //   { name: 'Moderate +10%', price: 550, ... },
  //   { name: 'Conservative +5%', price: 525, ... },
  //   { name: 'Maintain', price: 500, ... },
  // ]
  
  // For each scenario:
  // 1. Predict occupancy impact
  // 2. Calculate expected revenue
  // 3. Assess risk
  // 4. Rank scenarios
}
```

**Output**: Show user all scenarios with expected outcomes

---

### Week 10: Learning & Feedback

#### 4.3 Feedback Loop System 🔄
**Priority**: HIGH | **Cost**: $0

```typescript
// File: lib/learning/feedback-loop.ts

export interface PredictionFeedback {
  predictionId: string
  hotelId: string
  targetDate: Date
  predictedPrice: number
  actualPrice: number
  predictedOccupancy: number
  actualOccupancy: number
  actualRevenue: number
  error: number
  errorPercent: number
  agentAccuracies: Map<string, number>
}

export async function recordPredictionOutcome(
  predictionId: string,
  actualData: any
): Promise<void> {
  // 1. Get original prediction
  // 2. Compare with actual
  // 3. Calculate errors
  // 4. Update agent accuracy tracking
  // 5. Update historical accuracy map
}

export async function updateAgentWeights(
  hotelId: string
): Promise<void> {
  // 1. Get agent accuracy history
  // 2. Calculate new weights
  // 3. Update Decision Agent config
  // 4. Log changes
}
```

**Learning Cycle**:
1. Make prediction
2. Wait for actual data (after target date)
3. Compare prediction vs actual
4. Calculate agent-specific errors
5. Update agent weights
6. Improve future predictions

---

## 🎓 Phase 5: Self-Improvement (Weeks 11-12)

### Week 11: Advanced Learning

#### 5.1 A/B Testing Framework 🧪
**Priority**: MEDIUM | **Cost**: $0

```typescript
// File: lib/learning/ab-testing.ts

export interface ABTest {
  id: string
  name: string
  description: string
  variantA: string              // Control
  variantB: string              // Treatment
  hotelIds: string[]
  startDate: Date
  endDate: Date
  metrics: {
    revenue: number
    occupancy: number
    accuracy: number
  }
}

export async function runABTest(
  test: ABTest
): Promise<ABTestResults> {
  // Randomly assign hotels to A or B
  // Run different strategies
  // Compare results
  // Determine winner
}
```

**Test Ideas**:
- Conservative vs Aggressive pricing
- Static vs Dynamic weighting
- With vs Without certain agents
- Different confidence thresholds

---

#### 5.2 Agent Optimization 🎯
**Priority**: HIGH | **Cost**: $0

```typescript
// File: lib/learning/agent-optimizer.ts

export async function optimizeAgentWeights(
  hotelId: string,
  lookbackDays: number = 90
): Promise<DynamicWeights> {
  // 1. Get last 90 days of predictions
  // 2. Calculate which agents were most accurate
  // 3. Optimize weight distribution
  // 4. Test new weights
  // 5. Deploy if better
}
```

**Optimization Algorithm**:
- Gradient descent on weight parameters
- Minimize prediction error
- Constrain weights to sum to 1.0
- Validate on holdout set

---

### Week 12: Production Hardening

#### 5.3 Monitoring Dashboard 📊
**Priority**: HIGH | **Cost**: $0

```typescript
// Create comprehensive monitoring dashboard showing:
// - Agent performance metrics
// - Decision quality trends
// - Autopilot execution history
// - Prediction accuracy over time
// - Revenue impact
```

**Components**:
1. Real-time agent status
2. Prediction accuracy charts
3. Revenue impact visualization
4. Error rate tracking
5. Autopilot performance
6. A/B test results

---

#### 5.4 Alerts & Notifications 🔔
**Priority**: MEDIUM | **Cost**: $0

```typescript
// File: lib/monitoring/alerts.ts

export interface Alert {
  type: 'error' | 'warning' | 'info'
  agent: string
  message: string
  severity: 1-10
  timestamp: Date
}

// Alert conditions:
// - Agent failure rate > 10%
// - Prediction error > 15%
// - Autopilot makes risky change
// - Decision confidence < 60%
// - Conflicting agent recommendations
```

---

## 📈 Expected Outcomes

### Accuracy Improvement
- **Phase 1**: Baseline → +10-15% (Decision Agent)
- **Phase 2**: +10-15% → +25-35% (External data)
- **Phase 3**: +25-35% → +40-50% (Analysis agents)
- **Phase 4**: +40-50% → +50-60% (Autopilot)
- **Phase 5**: +50-60% → +60-70% (Learning)

### Revenue Impact
- **Conservative estimate**: +8-12% revenue
- **Realistic estimate**: +15-20% revenue
- **Optimistic estimate**: +25-30% revenue

### Time Savings
- **Manual pricing**: 2-4 hours/day
- **Autopilot**: 0 hours/day
- **Savings**: 60-120 hours/month

---

## 💰 Total Cost Breakdown

### APIs
1. CBS Tourism: **FREE**
2. Weather (enhanced): **$10/month**
3. NewsAPI: **FREE** (100 req/day)
4. Reddit API: **FREE**
5. Twitter Basic: **FREE** (limited)
6. Skyscanner: **FREE** tier
7. Google Trends: **FREE** (existing)

### Infrastructure
- Database: **$0** (existing Supabase)
- Compute: **$0** (existing Vercel)
- Storage: **$0** (under limits)

### **Total Monthly Cost**: **$10-30/month**

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] Prediction accuracy > 85%
- [ ] Agent uptime > 99%
- [ ] Decision confidence > 80%
- [ ] Processing time < 2 seconds

### Business Metrics
- [ ] Revenue increase > 15%
- [ ] Occupancy increase > 5%
- [ ] Manual effort reduced 90%
- [ ] User satisfaction > 4.5/5

---

## 🚀 Deployment Strategy

### Rollout Plan
1. **Week 1-2**: Test in staging with Hotel Scarlet
2. **Week 3-4**: Rollout to 3 pilot hotels
3. **Week 5-6**: Expand to 10 hotels
4. **Week 7-8**: Full rollout to all hotels
5. **Week 9+**: Monitor and optimize

### Risk Mitigation
- Start in dry-run mode
- Require human approval initially
- Gradual confidence threshold increase
- Rollback capability at all times
- 24/7 monitoring and alerts

---

## 📚 Documentation Requirements

For each agent:
- [ ] README with usage examples
- [ ] API documentation
- [ ] Error handling guide
- [ ] Performance benchmarks
- [ ] Integration tests

---

**Status**: Phase 1 Complete ✅
**Next Phase**: Phase 2 - External Data Agents
**Timeline**: 12 weeks total
**Progress**: Week 2 of 12 complete (17%)

