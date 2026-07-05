# 🚀 Prediction System V3 - Complete Setup Guide

## 📋 Overview

This document provides complete instructions for setting up and using the enhanced **Prediction System V3** with advanced AI agents:

- ✅ **Velocity Agent V2**: Booking curve analysis, cancellations, price sensitivity
- ✅ **CBS Agent**: Israeli tourism statistics integration
- ✅ **Weather Agent**: OpenWeather API with demand impact calculation
- ✅ **Events Agent V2**: Eventbrite + holidays + local events
- ✅ **Feedback Loop**: Prediction accuracy tracking and learning
- ✅ **Orchestrator V3**: Unified multi-agent coordination

---

## 📦 Prerequisites

### Required Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# External APIs (Optional but recommended)
OPENWEATHER_API_KEY=xxx        # Weather forecasts (https://openweathermap.org/api)
EVENTBRITE_API_KEY=xxx          # Event discovery (https://www.eventbrite.com/platform/api)
DATA_GOV_IL_API_KEY=xxx         # CBS official data (optional, has fallback)
SERPAPI_KEY=xxx                 # Google Trends (https://serpapi.com)
TAVILY_API_KEY=xxx              # General event search (https://tavily.com)
```

### Get API Keys

1. **OpenWeather**: [openweathermap.org/api](https://openweathermap.org/api) - Free tier: 1000 calls/day
2. **Eventbrite**: [eventbrite.com/platform](https://www.eventbrite.com/platform/api) - Free tier available
3. **SerpAPI**: [serpapi.com](https://serpapi.com) - 100 free searches/month
4. **Tavily**: [tavily.com](https://tavily.com) - 1000 free searches/month

---

## 🗄️ Database Setup

### Step 1: Run SQL Migrations

Execute these SQL scripts in **Supabase SQL Editor** (in order):

```sql
-- 1. Enhanced Booking Analytics
-- File: create-enhanced-booking-analytics.sql
-- Creates: booking_curve_analysis, cancellation_tracking, 
--          price_sensitivity_log, booking_velocity_snapshots
-- Adds columns: lead_time_days, cancellation_date to bookings
```

```sql
-- 2. Feedback Loop System
-- File: create-feedback-loop-system.sql
-- Creates: prediction_accuracy, model_performance_summary, factor_performance
-- Functions: calculate_accuracy_score(), update_prediction_actuals(),
--            auto_update_prediction_actuals()
```

```sql
-- 3. CBS Tourism Data
-- File: create-cbs-tourism-table.sql
-- Creates: cbs_tourism_data
-- Pre-populated with 36 rows of 2024-2025 data
```

### Step 2: Set Up Daily Cron Job

In **Supabase Dashboard** → **Database** → **Cron Jobs**:

```sql
-- Schedule daily at 2 AM to update prediction actuals
SELECT cron.schedule(
  'update-prediction-actuals',
  '0 2 * * *',  -- Every day at 2 AM
  $$SELECT auto_update_prediction_actuals();$$
);
```

This function compares predictions to actual bookings/prices and updates accuracy scores.

---

## 🧪 Testing & QA

### Run Complete QA Suite

```bash
# Make executable
chmod +x qa-prediction-system.mjs

# Run tests
node qa-prediction-system.mjs
```

### What QA Tests Check

1. ✅ All 8 new database tables exist
2. ✅ CBS tourism data is populated
3. ✅ Bookings table has new columns (lead_time_days, cancellation_date)
4. ✅ All 4 SQL functions exist
5. ✅ All agent modules load successfully
6. ✅ API routes are accessible
7. ✅ Environment variables are configured

### Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 QA TESTING SUITE - PREDICTION SYSTEM V3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DATABASE TESTS:
🧪 Testing: Database Tables Exist...
  ✅ Table 'booking_curve_analysis' exists
  ✅ Table 'cancellation_tracking' exists
  ...
✅ Database Tables Exist - PASSED (234ms)

📦 MODULE TESTS:
✅ Velocity Agent V2 Module - PASSED (45ms)
✅ CBS Agent Module - PASSED (38ms)
...

📊 QA SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Passed: 12/12 (100.0%)
❌ Failed: 0/12
⏱️  Total Time: 1847ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 Using the System

### API Endpoints

#### 1. Orchestrator V3 (Main Endpoint)

```bash
GET /api/orchestrator/v3?hotelId=xxx&dates=2025-02-01,2025-02-02&location=Tel%20Aviv
```

**Query Parameters:**
- `hotelId` (required): Hotel ID from database
- `dates` (optional): Comma-separated dates (default: next 7 days)
- `location` (optional): Location string (default: "Tel Aviv")
- `velocityV2=true/false`: Enable Velocity Agent V2
- `cbs=true/false`: Enable CBS Agent
- `weather=true/false`: Enable Weather Agent
- `eventsV2=true/false`: Enable Events Agent V2
- `historical=true/false`: Enable Historical Agent
- `statistics=true/false`: Enable Statistics Agent
- `trends=true/false`: Enable Trends Agent
- `competitors=true/false`: Enable Competitors Agent

**Example Response:**

```json
{
  "success": true,
  "hotel": {
    "id": "hotel-123",
    "name": "The Norman Tel Aviv",
    "basePrice": 800
  },
  "data": {
    "velocity": {
      "bookingCurve": { /* lead time distribution */ },
      "cancellations": { /* cancellation metrics */ },
      "priceSensitivity": { /* elasticity data */ },
      "mlFeatures": {
        "velocityMomentum": 1.23,
        "lastMinuteRatio": 0.15,
        "cancellationRisk": 0.08,
        "priceElasticity": -0.6,
        "demandPressure": 1.18
      },
      "confidence": 0.92
    },
    "cbs": {
      "current": { /* current month stats */ },
      "trends": { /* market analysis */ },
      "recommendation": { /* pricing advice */ },
      "confidence": 0.85
    },
    "weather": {
      "forecast": [
        {
          "date": "2025-02-01",
          "score": 85,
          "demandImpact": 1.08,
          "temperature": 22,
          "condition": "Clear"
        }
      ],
      "averageDemandImpact": 1.08,
      "confidence": 0.95
    },
    "events": {
      "events": [ /* event list */ ],
      "summary": {
        "totalEvents": 12,
        "highImpactEvents": 3,
        "demandImpact": 1.15
      },
      "confidence": 0.88
    }
  },
  "metadata": {
    "processingTime": 2847,
    "dataSources": ["velocity_v2", "cbs_tourism", "weather_forecast", "events_v2"],
    "dataQuality": "excellent",
    "overallConfidence": 0.89
  }
}
```

#### 2. Feedback API (Accuracy Tracking)

**Save Prediction:**

```bash
POST /api/feedback/accuracy
Content-Type: application/json

{
  "hotelId": "hotel-123",
  "targetDate": "2025-02-15",
  "predictedPrice": 950,
  "predictedOccupancy": 0.85,
  "predictedDemand": "high",
  "predictedRevenue": 28500,
  "confidence": 0.88,
  "factorsUsed": ["velocity", "cbs", "weather", "events"],
  "competitorPrices": [900, 920, 880],
  "leadTimeDays": 30
}
```

**Get Accuracy Metrics:**

```bash
GET /api/feedback/accuracy?hotelId=hotel-123&period=30
```

**Response:**

```json
{
  "hotelId": "hotel-123",
  "period": 30,
  "totalPredictions": 87,
  "metrics": {
    "averageAccuracy": 0.847,
    "priceError": 42.5,
    "occupancyError": 0.06,
    "revenueError": 1250
  },
  "distribution": {
    "veryAccurate": 45,
    "accurate": 28,
    "moderate": 10,
    "poor": 4
  },
  "trend": "improving",
  "bestPredictions": [ /* top 5 */ ],
  "worstPredictions": [ /* bottom 5 */ ]
}
```

---

## 📊 Agent Details

### Velocity Agent V2

**File:** `lib/agents/velocity-agent-v2.ts`

**Features:**
- Booking curve analysis (6 lead time buckets: 0-7, 8-14, 15-30, 31-60, 61-90, 90+ days)
- Cancellation rate tracking
- Price sensitivity analysis
- ML-ready features (5 metrics)

**Usage:**

```typescript
import { analyzeBookingVelocityV2 } from '@/lib/agents/velocity-agent-v2'

const result = await analyzeBookingVelocityV2('hotel-123', 30)

console.log(result.mlFeatures.velocityMomentum)      // 1.23
console.log(result.mlFeatures.priceElasticity)       // -0.6
console.log(result.bookingCurve.leadTimeBuckets)     // [0-7: 15%, 8-14: 25%, ...]
```

### CBS Agent

**File:** `lib/agents/cbs-agent.ts`

**Features:**
- Israeli tourism statistics
- Regional data (Tel Aviv, Jerusalem, Eilat, Dead Sea)
- YoY growth analysis
- Market-based pricing recommendations

**Usage:**

```typescript
import { analyzeCBSMarketTrends } from '@/lib/agents/cbs-agent'

const trends = await analyzeCBSMarketTrends('2025-02-01', 'tel_aviv')

console.log(trends.yearOverYearGrowth)    // 3.3%
console.log(trends.recommendation.suggestedMultiplier)  // 1.05x
```

### Weather Agent

**File:** `lib/agents/weather-agent.ts`

**Features:**
- OpenWeather API integration
- Weather scoring (0-100)
- Demand impact calculation (0.85x - 1.15x)
- Seasonal fallback for Tel Aviv

**Usage:**

```typescript
import { getWeatherForecast } from '@/lib/agents/weather-agent'

const weather = await getWeatherForecast('2025-02-01', '2025-02-07', 'Tel Aviv')

weather.forecast.forEach(day => {
  console.log(`${day.date}: Score ${day.score}/100, Impact ${day.demandImpact}x`)
})
```

**Scoring Logic:**
- Optimal temp (20-28°C): +30 points
- Clear sky: +25 points
- Rain: -20 points
- Storm: -30 points
- High humidity (>80%): -10 points
- Strong wind (>10 m/s): -10 points

### Events Agent V2

**File:** `lib/agents/events-agent-v2.ts`

**Features:**
- Eventbrite API integration
- Israeli holidays calendar (2025-2026)
- Local recurring events (Tel Aviv)
- Impact assessment (very_high, high, medium, low)

**Usage:**

```typescript
import { getEnhancedEvents } from '@/lib/agents/events-agent-v2'

const events = await getEnhancedEvents('Tel Aviv', '2025-04-13', '2025-04-19')

console.log(events.summary.totalEvents)         // 15
console.log(events.summary.highImpactEvents)    // 5 (Passover week)
console.log(events.summary.demandImpact)        // 1.25x
```

---

## 🔄 Workflow

### 1. Data Collection

```typescript
import { orchestrateComprehensiveDataV3 } from '@/lib/agents/orchestrator-v3'

const data = await orchestrateComprehensiveDataV3(
  'hotel-123',
  'The Norman Tel Aviv',
  'Tel Aviv',
  ['2025-02-01', '2025-02-02'],
  800
)
```

### 2. Price Prediction

Use orchestrator data to calculate optimal price:

```typescript
let basePrice = 800
let multiplier = 1.0

// Apply velocity
if (data.velocity) {
  multiplier *= data.velocity.mlFeatures.demandPressure
}

// Apply CBS trends
if (data.cbs) {
  multiplier *= data.cbs.recommendation.suggestedMultiplier
}

// Apply weather
if (data.weather) {
  multiplier *= data.weather.averageDemandImpact
}

// Apply events
if (data.events) {
  multiplier *= data.events.summary.demandImpact
}

const predictedPrice = Math.round(basePrice * multiplier)
```

### 3. Save Prediction for Tracking

```typescript
await fetch('/api/feedback/accuracy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hotelId: 'hotel-123',
    targetDate: '2025-02-01',
    predictedPrice,
    confidence: data.overallConfidence,
    factorsUsed: data.dataSources
  })
})
```

### 4. Review Accuracy

```typescript
const accuracy = await fetch('/api/feedback/accuracy?hotelId=hotel-123&period=30')
  .then(r => r.json())

console.log(`Average accuracy: ${accuracy.metrics.averageAccuracy * 100}%`)
console.log(`Trend: ${accuracy.trend}`)  // "improving"
```

---

## 📈 Performance

### Processing Times

- **Velocity Agent V2**: ~500ms (database queries)
- **CBS Agent**: ~800ms (API or cached)
- **Weather Agent**: ~1200ms (OpenWeather API)
- **Events Agent V2**: ~1500ms (Eventbrite + calendar)
- **Orchestrator V3 Total**: ~3-5 seconds (parallel execution)

### Optimization Tips

1. **Cache Results**: Use external-data-cache for repeated requests
2. **Parallel Execution**: Orchestrator runs agents concurrently
3. **Limit Dates**: Test with 1-7 dates, production with up to 30
4. **Disable Unused Agents**: Set query params to false if not needed

---

## 🐛 Troubleshooting

### Issue: "Table does not exist"

**Solution**: Run SQL migrations in Supabase SQL Editor

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%booking%' 
  OR table_name LIKE '%prediction%'
  OR table_name LIKE '%cbs%';
```

### Issue: "Function does not exist"

**Solution**: Run `create-feedback-loop-system.sql` to create functions

### Issue: Weather Agent Returns Estimates

**Reason**: `OPENWEATHER_API_KEY` not set or API limit reached

**Solution**: 
1. Set API key in environment
2. Check API usage at openweathermap.org
3. Fallback uses seasonal estimates (still useful)

### Issue: Low Confidence Scores

**Reason**: External APIs unavailable

**Solution**:
1. Check API keys are correct
2. Review network connectivity
3. Check API rate limits
4. System works with fallbacks, confidence will be lower

---

## 🚀 Deployment Checklist

- [ ] Run all 3 SQL migrations in Supabase
- [ ] Set up daily cron job for `auto_update_prediction_actuals()`
- [ ] Configure environment variables (required + optional)
- [ ] Run QA suite: `node qa-prediction-system.mjs`
- [ ] Test Orchestrator V3 API endpoint
- [ ] Save first prediction to Feedback API
- [ ] Monitor accuracy over 7-14 days
- [ ] Review agent logs for errors
- [ ] Check Supabase function logs for cron job
- [ ] Verify prediction accuracy improving over time

---

## 📚 Additional Resources

- **Multi-Agent System**: See `MULTI_AGENT_DEBUGGING.md`
- **Prediction Architecture**: See `PREDICTION_ARCHITECTURE.md`
- **Data Flow**: See `DATA_FLOW_EXPLANATION.md`
- **Budget Analysis**: See `RULES_SETTINGS_GUIDE.md`

---

## 🎯 Success Metrics

After 14 days of operation:

- ✅ Prediction accuracy: >75%
- ✅ Price error: <10% of actual
- ✅ Revenue error: <15% of actual
- ✅ Data quality: "good" or "excellent"
- ✅ Overall confidence: >0.70
- ✅ Trend: "improving" or "stable"

---

## 💡 Next Steps

1. **Machine Learning**: Train XGBoost/Random Forest on `mlFeatures`
2. **A/B Testing**: Compare V2 vs V3 predictions
3. **Real-Time Updates**: WebSocket for live competitor prices
4. **Mobile App**: iOS/Android with prediction dashboard
5. **Multi-Hotel**: Extend to hotel chains

---

**Questions?** Check the code comments or contact support.

**Version:** 3.0.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Production Ready
