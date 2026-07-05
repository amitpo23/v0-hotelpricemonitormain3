# Autopilot Intelligence Suite - Technical Documentation

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Autopilot Intelligence Suite                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────┐    ┌──────────────────────────┐  │
│  │   Forecast Engine     │    │   Alert Detection        │  │
│  │                       │    │   Engine                 │  │
│  │  • YoY Analysis       │    │  • 5 Alert Types         │  │
│  │  • Competitor Compare │    │  • Statistical Analysis  │  │
│  │  • Demand Multiplier  │    │  • Severity Scoring      │  │
│  │  • Risk Assessment    │    │  • Revenue Loss Calc     │  │
│  └───────────┬───────────┘    └────────────┬─────────────┘  │
│              │                              │                │
│              └──────────┬───────────────────┘                │
│                         │                                    │
│              ┌──────────▼──────────┐                         │
│              │   Supabase DB       │                         │
│              │  • price_predictions│                         │
│              │  • competitor_prices│                         │
│              │  • revenue_tracking │                         │
│              │  • daily_prices     │                         │
│              └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. `/api/autopilot/forecast` - Revenue Forecasting

**Method:** GET  
**maxDuration:** 60 seconds  
**Purpose:** Simulate revenue if Multi-Agent system manages pricing

#### Request Parameters
```typescript
interface ForecastRequest {
  hotelId: string        // Required: Hotel UUID
  startDate: string      // Format: YYYY-MM-DD
  endDate: string        // Format: YYYY-MM-DD
}
```

#### Response Structure
```typescript
interface AutopilotForecast {
  hotelId: string
  hotelName: string
  period: string
  currentRevenue: number              // Current pricing strategy
  forecastedRevenue: number           // With Autopilot
  revenueIncrease: number             // Absolute increase
  percentIncrease: number             // Percentage increase
  
  recommendedActions: Array<{
    date: string
    currentPrice: number
    recommendedPrice: number
    reasoning: string                 // Why this price?
    expectedRevenue: number
    confidence: number                // 0-100
  }>
  
  summary: {
    totalDays: number
    daysAnalyzed: number
    avgPriceIncrease: number
    highDemandDays: number
    lowDemandDays: number
    competitorComparison: string
  }
  
  historicalAnalysis: {
    similarPeriodLastYear: number
    yoyGrowth: number
    seasonalTrend: 'peak_season' | 'low_season' | 'shoulder_season'
  }
  
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    recommendation: string
  }
}
```

#### Algorithm Flow

1. **Data Collection** (Lines 48-91)
```sql
-- Fetch predictions
SELECT * FROM price_predictions 
WHERE hotel_id = ? AND date BETWEEN ? AND ?

-- Fetch competitor prices
SELECT date, AVG(price) as avg_competitor_price
FROM competitor_daily_prices
GROUP BY date

-- Fetch historical data (last year)
SELECT * FROM daily_prices 
WHERE hotel_id = ? AND date BETWEEN lastYear AND lastYearEnd

-- Fetch bookings
SELECT date, COUNT(*) as bookings_count
FROM bookings
WHERE hotel_id = ? AND check_in_date >= ?
```

2. **Day-by-Day Analysis** (Lines 104-175)
```typescript
for each date in period {
  // Get data points
  currentPrice = predictions[date]?.predicted_price || hotel.base_price
  competitorAvg = competitors[date]?.avg_price
  historicalOccupancy = lastYearData[date]?.occupancy_rate
  bookingsCount = bookings[date]?.count || 0
  
  // Calculate demand multiplier
  demandMultiplier = 1.0
  
  // Factor 1: Historical occupancy
  if (historicalOccupancy > 75) demandMultiplier *= 1.15      // High
  else if (historicalOccupancy > 50) demandMultiplier *= 1.05 // Medium
  else demandMultiplier *= 0.92                                // Low
  
  // Factor 2: Weekend premium
  if (isWeekend(date)) demandMultiplier *= 1.12
  
  // Factor 3: Competitor comparison
  if (currentPrice > competitorAvg * 1.2) demandMultiplier *= 0.85
  else if (currentPrice < competitorAvg * 0.8) demandMultiplier *= 1.15
  
  // Factor 4: Early bookings boost
  if (bookingsCount > 3) demandMultiplier *= 1.05
  
  // Calculate recommended price
  basePrice = competitorAvg || currentPrice
  recommendedPrice = round(basePrice * demandMultiplier / 5) * 5
  confidence = calculateConfidence(dataQuality)
  
  // Expected revenue
  expectedRevenue = recommendedPrice * hotel.total_rooms * occupancyRate
}
```

3. **Historical Comparison** (Lines 177-196)
```typescript
similarPeriodLastYear = sum(lastYearRevenue)
yoyGrowth = ((forecastedRevenue - similarPeriodLastYear) / similarPeriodLastYear) * 100

seasonalTrend = determineSeason(avgOccupancy, avgPriceIncrease)
```

4. **Risk Assessment** (Lines 198-215)
```typescript
riskLevel = 'low'
factors = []

if (avgPriceIncrease > 50) {
  riskLevel = 'high'
  factors.push('Average price increase exceeds 50%')
}

if (highDemandDays / totalDays > 0.7) {
  if (avgPriceIncrease > 30) riskLevel = 'medium'
  factors.push('High demand period with significant price changes')
}

if (competitorAvgDiff > 25) {
  factors.push('Significant deviation from competitor pricing')
}
```

---

### 2. `/api/pricing/alerts` - Pricing Alert Detection

**Method:** GET  
**maxDuration:** 60 seconds  
**Purpose:** Detect incorrect/suboptimal pricing

#### Request Parameters
```typescript
interface AlertsRequest {
  hotelId: string
  startDate: string
  endDate: string
  minSeverity?: 'low' | 'medium' | 'high' | 'critical'  // Default: 'medium'
}
```

#### Response Structure
```typescript
interface PricingAlert {
  id: string                    // Unique alert ID
  date: string
  hotelId: string
  hotelName: string
  alertType: 'competitor_gap' | 'underpriced' | 'demand_mismatch' | 
             'anomaly' | 'historical'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentPrice: number
  suggestedPrice: number
  priceDifference: number
  reasoning: string
  dataPoints: {
    competitorAvg?: number
    historicalAvg?: number
    occupancyRate?: number
    demandLevel?: string
  }
  recommendation: string
  potentialRevenueLoss: number
}

interface AlertsResponse {
  alerts: PricingAlert[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    totalPotentialLoss: number
  }
}
```

#### Detection Algorithms

##### 1. Competitor Gap Detection (Lines 138-176)
```typescript
competitorAvg = avg(competitor_daily_prices[date])
priceDiff = (currentPrice - competitorAvg) / competitorAvg * 100

// Critical: >35% difference
if (Math.abs(priceDiff) > 35) {
  severity = 'critical'
  potentialLoss = Math.abs(currentPrice - competitorAvg) * rooms * 0.5
}
// High: 25-35%
else if (Math.abs(priceDiff) > 25) {
  severity = 'high'
  potentialLoss = Math.abs(currentPrice - competitorAvg) * rooms * 0.4
}
// Medium: 20-25%
else if (Math.abs(priceDiff) > 20) {
  severity = 'medium'
  potentialLoss = Math.abs(currentPrice - competitorAvg) * rooms * 0.3
}

suggestedPrice = round(competitorAvg * 0.98 / 5) * 5  // 2% below average
```

##### 2. Underpriced Detection (Lines 138-176)
```typescript
// Only if demand is high
if (occupancyRate > 75 && currentPrice < competitorAvg * 0.85) {
  severity = 'critical'
  suggestedPrice = round(competitorAvg * 0.92 / 5) * 5
  potentialLoss = (suggestedPrice - currentPrice) * rooms * occupancyRate
  
  alert({
    type: 'underpriced',
    reasoning: `High demand (${occupancyRate}%) but price too low`,
    recommendation: `Increase to ₪${suggestedPrice}`
  })
}
```

##### 3. Demand Mismatch Detection (Lines 179-223)
```typescript
determinedemandLevel(occupancyRate) {
  if (occupancyRate > 75) return 'high'
  if (occupancyRate > 50) return 'medium'
  return 'low'
}

// HIGH demand but LOW price
if (demandLevel === 'high' && currentPrice < avgPrice * 0.9) {
  suggestedPrice = round(avgPrice * 1.1 / 5) * 5
  severity = 'high'
  potentialLoss = (suggestedPrice - currentPrice) * rooms * occupancyRate
}

// LOW demand but HIGH price
else if (demandLevel === 'low' && currentPrice > avgPrice * 1.1) {
  suggestedPrice = round(avgPrice * 0.9 / 5) * 5
  severity = 'medium'
  potentialLoss = (currentPrice - suggestedPrice) * rooms * 0.3
}
```

##### 4. Statistical Anomaly Detection (Lines 226-246)
```typescript
// Calculate statistics
prices = all_prices_in_period
avgPrice = mean(prices)
stdDev = standardDeviation(prices)

// Outlier detection (>2.5 standard deviations)
zScore = (currentPrice - avgPrice) / stdDev
if (Math.abs(zScore) > 2.5) {
  alert({
    type: 'anomaly',
    severity: 'medium',
    reasoning: `Statistical outlier: ₪${currentPrice} vs avg ₪${avgPrice}`,
    suggestedPrice: round(avgPrice / 5) * 5,
    recommendation: 'Review if price is intentional'
  })
}
```

##### 5. Historical Deviation Detection (Lines 249-273)
```typescript
lastYearDate = new Date(date)
lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)

historicalPrice = getPrice(lastYearDate)
deviation = Math.abs((currentPrice - historicalPrice) / historicalPrice * 100)

// >30% deviation from last year
if (deviation > 30) {
  alert({
    type: 'historical',
    severity: 'low',
    reasoning: `${deviation}% deviation from last year (₪${historicalPrice})`,
    recommendation: 'Verify if change is justified'
  })
}
```

#### Alert Prioritization
```typescript
// Sort by severity and potential loss
alerts.sort((a, b) => {
  const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 }
  
  // First by severity
  if (severityOrder[a.severity] !== severityOrder[b.severity]) {
    return severityOrder[b.severity] - severityOrder[a.severity]
  }
  
  // Then by potential revenue loss
  return b.potentialRevenueLoss - a.potentialRevenueLoss
})
```

---

## UI Components

### 1. `/app/autopilot/tools/page.tsx` - Server Component
```typescript
// Fetches hotels from Supabase
// Renders AutopilotTools client component
export default async function AutopilotToolsPage() {
  const supabase = await createClient()
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, total_rooms, base_price')
    
  return <AutopilotTools hotels={hotels} />
}
```

### 2. `/app/autopilot/tools/autopilot-tools-client.tsx` - Client Component
```typescript
// Main UI with two tabs
export function AutopilotTools({ hotels }: Props) {
  const [activeTab, setActiveTab] = useState<'forecast' | 'alerts'>('forecast')
  const [forecast, setForecast] = useState<AutopilotForecast | null>(null)
  const [alerts, setAlerts] = useState<PricingAlert[]>([])
  
  // Fetch forecast
  const fetchForecast = async () => {
    const response = await fetch(`/api/autopilot/forecast?...`)
    const data = await response.json()
    setForecast(data)
  }
  
  // Fetch alerts
  const fetchAlerts = async () => {
    const response = await fetch(`/api/pricing/alerts?...`)
    const data = await response.json()
    setAlerts(data.alerts)
    setAlertsSummary(data.summary)
  }
  
  // Render tabs, controls, and results
}
```

#### Key UI Features
- **Hotel Selector**: Dropdown with total_rooms and base_price display
- **Tab System**: Switch between Forecast and Alerts
- **Date Range Pickers**: 7/14/30/60/90 days for forecast, 7/14/30/60 for alerts
- **Loading States**: Spinner with "מחשב..." / "סורק..." text
- **Stats Cards**: 4 cards for forecast summary
- **Risk Badges**: Color-coded (green/yellow/red) based on risk level
- **Alerts Table**: Sortable, filterable, with severity badges
- **RTL Support**: Full Hebrew right-to-left layout

---

## Database Schema

### Tables Used

#### 1. `price_predictions`
```sql
CREATE TABLE price_predictions (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  date DATE NOT NULL,
  predicted_price NUMERIC(10,2),
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 2. `competitor_daily_prices`
```sql
CREATE TABLE competitor_daily_prices (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  competitor_name VARCHAR(255),
  price NUMERIC(10,2),
  source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 3. `daily_prices`
```sql
CREATE TABLE daily_prices (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  date DATE NOT NULL,
  price NUMERIC(10,2),
  occupancy_rate NUMERIC(5,2),
  rooms_sold INTEGER,
  revenue NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 4. `revenue_tracking`
```sql
CREATE TABLE revenue_tracking (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  date DATE NOT NULL,
  revenue NUMERIC(10,2),
  bookings INTEGER,
  occupancy_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 5. `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  check_in_date DATE,
  check_out_date DATE,
  booking_date TIMESTAMPTZ,
  total_price NUMERIC(10,2),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## Performance Considerations

### 1. Query Optimization
```typescript
// Use date range indexes
CREATE INDEX idx_predictions_date ON price_predictions(hotel_id, date)
CREATE INDEX idx_competitor_date ON competitor_daily_prices(date)
CREATE INDEX idx_daily_prices_date ON daily_prices(hotel_id, date)
CREATE INDEX idx_bookings_checkin ON bookings(hotel_id, check_in_date)
```

### 2. Caching Strategy
```typescript
// Future: Implement Redis caching for frequently accessed data
const cacheKey = `forecast:${hotelId}:${startDate}:${endDate}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// ... calculate forecast ...

await redis.setex(cacheKey, 3600, JSON.stringify(forecast))  // 1 hour TTL
```

### 3. Request Timeouts
```typescript
// Both APIs use maxDuration = 60
export const maxDuration = 60  // Vercel serverless function timeout
```

---

## Testing

### Unit Tests (To Implement)
```typescript
describe('Forecast Engine', () => {
  test('calculates demand multiplier correctly', () => {
    const multiplier = calculateDemandMultiplier({
      occupancy: 80,
      isWeekend: true,
      competitorPrice: 500,
      currentPrice: 450,
      bookingsCount: 5
    })
    expect(multiplier).toBeGreaterThan(1.2)
  })
  
  test('risk assessment logic', () => {
    const risk = assessRisk({
      avgPriceIncrease: 55,
      highDemandDays: 20,
      totalDays: 30,
      competitorDeviation: 30
    })
    expect(risk.level).toBe('high')
  })
})

describe('Alert Detection', () => {
  test('detects competitor gap correctly', () => {
    const alert = detectCompetitorGap({
      currentPrice: 600,
      competitorAvg: 420,
      rooms: 50
    })
    expect(alert.severity).toBe('critical')
    expect(alert.potentialRevenueLoss).toBeGreaterThan(0)
  })
  
  test('identifies underpriced high-demand dates', () => {
    const alert = detectUnderpriced({
      currentPrice: 350,
      competitorAvg: 450,
      occupancy: 85
    })
    expect(alert.severity).toBe('critical')
  })
})
```

### Integration Tests
```bash
# Test forecast API
curl "http://localhost:3000/api/autopilot/forecast?hotelId=123&startDate=2025-02-01&endDate=2025-02-28"

# Test alerts API
curl "http://localhost:3000/api/pricing/alerts?hotelId=123&startDate=2025-02-01&endDate=2025-02-28&minSeverity=medium"
```

---

## Error Handling

### API Errors
```typescript
try {
  const { data, error } = await supabase.from('...').select('...')
  if (error) throw error
  
  // ... processing ...
  
  return NextResponse.json(result)
} catch (error) {
  console.error('Forecast error:', error)
  return NextResponse.json(
    { error: 'Failed to generate forecast', details: error.message },
    { status: 500 }
  )
}
```

### Client-Side Error Handling
```typescript
const fetchForecast = async () => {
  setLoadingForecast(true)
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('API request failed')
    const data = await response.json()
    setForecast(data)
  } catch (error) {
    console.error('Error fetching forecast:', error)
    // Show toast notification or error state
  } finally {
    setLoadingForecast(false)
  }
}
```

---

## Security Considerations

### 1. Input Validation
```typescript
// Validate dates
const startDate = new Date(params.startDate)
const endDate = new Date(params.endDate)
if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
  return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
}

// Validate date range
const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24)
if (daysDiff > 365) {
  return NextResponse.json({ error: 'Date range too large' }, { status: 400 })
}
```

### 2. Authentication (To Implement)
```typescript
// Add middleware to verify user access
const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Verify hotel access
const hasAccess = await checkHotelAccess(session.user.id, hotelId)
if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 3. Rate Limiting (To Implement)
```typescript
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 requests per minute
})

const { success } = await ratelimit.limit(userId)
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

---

## Deployment

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vercel Configuration
```json
{
  "functions": {
    "app/api/autopilot/forecast/route.ts": {
      "maxDuration": 60
    },
    "app/api/pricing/alerts/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Build Steps
```bash
# Install dependencies
pnpm install

# Run type checking
pnpm tsc --noEmit

# Build for production
pnpm build

# Deploy to Vercel
vercel --prod
```

---

## Monitoring

### Key Metrics to Track
```typescript
// Log execution time
const startTime = Date.now()
// ... processing ...
const executionTime = Date.now() - startTime
console.log(`Forecast generated in ${executionTime}ms`)

// Track API usage
await analytics.track({
  event: 'forecast_generated',
  userId: session.user.id,
  hotelId,
  dateRange: { startDate, endDate },
  executionTime,
  dataPoints: recommendedActions.length
})
```

### Error Tracking
```typescript
// Integrate Sentry or similar
import * as Sentry from '@sentry/nextjs'

try {
  // ... processing ...
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'autopilot-forecast' },
    extra: { hotelId, dateRange }
  })
  throw error
}
```

---

## Future Enhancements

### 1. Real-time Updates
```typescript
// WebSocket connection for live alerts
const ws = new WebSocket('wss://api.hotel.com/alerts')
ws.on('new-alert', (alert) => {
  // Push notification to UI
  toast.error(`New critical alert: ${alert.date}`)
})
```

### 2. Automated Actions
```typescript
// Auto-adjust prices based on alerts
if (alert.severity === 'critical' && settings.autoAdjust) {
  await updatePrice(alert.date, alert.suggestedPrice)
  await notifyManager(`Price adjusted: ${alert.date}`)
}
```

### 3. Machine Learning Model
```python
# Train ML model for better predictions
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(n_estimators=100)
model.fit(X_train, y_train)

# Features: day_of_week, month, is_weekend, historical_occupancy,
#           competitor_avg, days_until_checkin, events, weather
```

### 4. Integration with PMS
```typescript
// Sync prices directly with Property Management System
await pms.updateRoomRate({
  date: '2025-02-15',
  roomType: 'standard',
  rate: 520
})
```

---

## Contributing

### Code Style
```typescript
// Use TypeScript strict mode
"compilerOptions": {
  "strict": true,
  "noImplicitAny": true
}

// Follow naming conventions
- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase with 'I' prefix for interfaces
```

### Pull Request Process
1. Create feature branch from `main`
2. Write tests for new features
3. Update documentation
4. Run `pnpm lint && pnpm test`
5. Submit PR with clear description

---

## License
MIT License - See LICENSE file for details

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Maintainer:** Hotel Revenue Management Team
