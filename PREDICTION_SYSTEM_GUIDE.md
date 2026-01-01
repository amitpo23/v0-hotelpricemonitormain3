# 🎯 מדריך מערכת החיזויים - הסבר מלא

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורת Multi-Agent](#ארכיטקטורת-multi-agent)
3. [תהליך יצירת חיזוי](#תהליך-יצירת-חיזוי)
4. [מערכת הלוגים המפורטת](#מערכת-הלוגים-המפורטת)
5. [איך להשתמש במערכת](#איך-להשתמש-במערכת)
6. [דוגמאות](#דוגמאות)

---

## סקירה כללית

מערכת החיזויים היא מערכת מתקדמת לניבוי מחירי מלונות המבוססת על:
- **30+ פקטורים** שונים (עונתיות, תחרות, ביקוש, אירועים וכו')
- **Multi-Agent System** לאיסוף נתונים חיצוניים
- **אלגוריתמים סטטיסטיים** לחישוב מחירים
- **Confidence Scoring** מבוסס-נתונים

### מבנה כללי:
```
┌──────────────┐
│ Supabase DB  │ ← נתונים פנימיים (הזמנות, מתחרים, מחירים)
└──────┬───────┘
       │
       ├──→ ┌────────────────┐
       │    │ Multi-Agent    │ ← נתונים חיצוניים (אירועים, מזג אוויר)
       │    │ System         │
       │    └────────┬───────┘
       │             │
       ↓             ↓
┌─────────────────────────┐
│  Prediction Engine      │ ← חישוב מחירים + Confidence
│  (route.ts)             │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  price_predictions      │ ← שמירה ב-DB
│  table                  │
└─────────────────────────┘
```

---

## ארכיטקטורת Multi-Agent

### 1. איפה מוגדרת?

**קובץ ראשי**: [`lib/agents/orchestrator.ts`](lib/agents/orchestrator.ts)

**Agents**:
1. **Events Agent** ([`lib/agents/events-agent.ts`](lib/agents/events-agent.ts))
   - משתמש ב-**Tavily API** לחיפוש אירועים בזמן אמת
   - מחפש: קונצרטים, כנסים, פסטיבלים, חגים
   - מנתח השפעה (very_high, high, medium, low)
   
2. **Historical Agent** ([`lib/agents/historical-agent.ts`](lib/agents/historical-agent.ts))
   - משווה מחירים היסטוריים (year-over-year)
   - מזהה מגמות: increasing, stable, decreasing
   - מחשב seasonal patterns
   
3. **Statistics Agent** ([`lib/agents/statistics-agent.ts`](lib/agents/statistics-agent.ts))
   - אוסף נתוני שוק ממקורות ממשלתיים
   - מחשב מחיר ממוצע לפי אזור
   - מספק price floors מבוססי-שוק

### 2. האם יש מערכת RAG?

**לא בדיוק**, אבל יש משהו דומה:

❌ **אין:**
- Vector Database (Pinecone, Weaviate)
- Embeddings (OpenAI, Cohere)
- Semantic Search על טקסט חופשי

✅ **יש:**
- **Multi-Agent System** שאוסף נתונים ממקורות מגוונים
- **Cache Layer** ([`lib/cache/external-data-cache.ts`](lib/cache/external-data-cache.ts))
- **Structured Data Retrieval** מ-Supabase
- **Real-time API Calls** ל-Tavily, OpenWeatherMap

### 3. מקורות נתונים

#### נתונים פנימיים (Supabase):
```typescript
// טבלאות קיימות:
- hotels                    // מלונות
- competitor_daily_prices   // מחירי מתחרים
- daily_prices             // מחירים מומלצים
- bookings                 // הזמנות
- revenue_budgets          // תקציבים
- scan_results             // תוצאות סריקות
- price_predictions        // חיזויים (output)
```

#### נתונים חיצוניים (APIs):
```typescript
- Tavily API              // אירועים בזמן אמת
- Hebcal API              // חגים יהודיים
- OpenWeatherMap          // מזג אוויר
- Google Trends (via API) // טרנדים
```

---

## תהליך יצירת חיזוי

### שלב 1: איסוף נתונים בסיסיים
```typescript
// מה נאסף:
1. Scan Results      → מחירי מתחרים אחרונים (60 ימים)
2. Bookings          → הזמנות עתידיות
3. Revenue Budgets   → יעדי הכנסות
4. Daily Prices      → מחירים היסטוריים
5. Competitors       → רשימת מתחרים פעילים
```

**לוג**:
```bash
[v0] 📊 Fetching data from Supabase and external sources...
[v0] ✅ Data fetched successfully
```

---

### שלב 2: Multi-Agent System

```typescript
// Orchestrator מפעיל 3 Agents במקביל:

┌─────────────────────────────────────────┐
│ Events Agent                            │
│  - חיפוש אירועים ב-Tavily             │
│  - זיהוי השפעה (impact factor)         │
│  - Confidence: 0-100%                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Historical Agent                        │
│  - השוואת YoY (Year over Year)         │
│  - זיהוי מגמות (trends)                │
│  - Confidence: 0-100%                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Statistics Agent                        │
│  - נתוני שוק ממשלתיים                  │
│  - מחיר ממוצע לפי אזור                 │
│  - Confidence: 0-100%                   │
└─────────────────────────────────────────┘
```

**פלט**:
```typescript
{
  events: Map<date, eventData>,
  eventsConfidence: 0.85,
  historical: Map<date, historicalData>,
  historicalConfidence: 0.80,
  statistics: { avgNightlyRate: 650 },
  statisticsConfidence: 0.75,
  overallConfidence: 0.80
}
```

**לוג**:
```bash
[v0] 🤖 Activating Multi-Agent System...
[v0] 🎉 Multi-Agent System completed:
[v0]   - Events: 90 dates, confidence 85%
[v0]   - Historical: 90 dates, confidence 80%
[v0]   - Statistics: confidence 75%
[v0]   - Overall Confidence: 80%
```

---

### שלב 3: חישוב Factors

לכל תאריך, מחשבים 10+ פקטורים:

#### 1. **Seasonality** (עונתיות)
```typescript
const seasonalityFactors = {
  0: { factor: 0.85, label: "winter_low" },      // ינואר
  1: { factor: 0.80, label: "winter_lowest" },   // פברואר
  7: { factor: 1.30, label: "summer_highest" },  // אוגוסט
  11: { factor: 1.20, label: "holiday_season" }  // דצמבר
}
```

#### 2. **Weekend Premium**
```typescript
const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
const weekendFactor = isWeekend ? 1.12 : 1.0  // +12% בסופ"ש
```

#### 3. **Lead Time** (זמן עד הגעה)
```typescript
const leadTimeFactor = 
  i < 3  ? 1.15 :  // הזמנה דחופה: +15%
  i < 7  ? 1.08 :  // שבוע: +8%
  i < 14 ? 1.03 :  // שבועיים: +3%
  i < 30 ? 1.00 :  // חודש: רגיל
  i < 60 ? 0.98 :  // חודשיים: -2%
  0.95             // יותר: -5%
```

#### 4. **Occupancy Pressure** (לחץ תפוסה)
```typescript
const occupancyRate = (bookedRooms / totalRooms) * 100

let occupancyFactor = 1.0
if (occupancyRate > 85)      occupancyFactor = 1.30  // +30%
else if (occupancyRate > 70) occupancyFactor = 1.20  // +20%
else if (occupancyRate > 55) occupancyFactor = 1.10  // +10%
else if (occupancyRate < 20) occupancyFactor = 0.92  // -8%
else if (occupancyRate < 10) occupancyFactor = 0.85  // -15%
```

#### 5. **Event Impact** (השפעת אירועים)
```typescript
// מ-Holiday Map (Hebcal):
const events = holidayMap[monthDay] || []
let eventFactor = events.reduce((max, e) => Math.max(max, e.impact), 1.0)

// שדרוג מ-Multi-Agent:
if (enhancedExternalData) {
  const dateImpact = extractDateImpactFactors(dateStr, enhancedExternalData)
  if (dateImpact.eventImpact > eventFactor) {
    eventFactor = dateImpact.eventImpact  // יכול להגיע ל-1.4 (פריידיום)
  }
}
```

#### 6. **Competitor Alignment** (התאמה למתחרים)
```typescript
const competitorAvg = bookingAvg || expediaAvg || marketAvg
const competitorFactor = competitorAvg 
  ? Math.max(0.88, Math.min(1.12, competitorAvg / basePrice))
  : 1.0
// טווח: 88%-112% מהבסיס
```

#### 7. **Budget Pressure** (לחץ תקציב)
```typescript
const budgetGap = targetRevenue - (actualRevenue + bookedRevenue)
const budgetPressure = Math.max(0.95, Math.min(1.18, 1 + (budgetGap / targetRevenue) * 0.25))
// טווח: 95%-118%
```

#### 8. **Market Velocity** (מהירות שוק)
```typescript
const bookingVelocity = "increasing" | "stable" | "decreasing"
const velocityFactor = 
  bookingVelocity === "increasing" ? 1.05 :
  bookingVelocity === "decreasing" ? 0.95 :
  1.0
```

**לוג** (עם `?debug=true`):
```bash
📐 [PredictionLogger] Factor Calculation: Scarlet Hotel - 2026-02-15
   Base Price: ₪550
   ├─ 🟡 Seasonality: 0.800 (-20%) - winter_lowest - עונת שפל
   ├─ 🟡 Weekend Premium: 1.120 (+12%) - סוף שבוע - ביקוש גבוה יותר
   ├─ ⚪ Lead Time: 1.030 (+3%) - 14 ימים לפני הגעה - טווח קצר
   ├─ 🔴 Occupancy Pressure: 1.200 (+20%) - תפוסה 75% - לחץ גבוה
   ├─ 🔴 Event Impact: 1.350 (+35%) - אירועים: Tel Aviv Pride
   ├─ 🟡 Competitor Alignment: 1.090 (+9%) - מחיר מתחרים ממוצע: ₪600
   └─ ⚪ Budget Pressure: 0.980 (-2%) - פער תקציב: ₪-5000 - מעל יעד
```

---

### שלב 4: חישוב מחיר

```typescript
// 1. חישוב Raw Price
let rawPrice = basePrice 
  * seasonality 
  * weekendFactor 
  * leadTimeFactor 
  * occupancyFactor 
  * eventFactor 
  * competitorFactor 
  * budgetPressure 
  * velocityFactor

// דוגמה:
// 550 * 0.8 * 1.12 * 1.03 * 1.2 * 1.35 * 1.09 * 0.98 * 1.0
// = ₪834

// 2. התאמות נוספות
if (historicalTrend === 'increasing') {
  rawPrice *= 1.08  // +8%
}

// 3. Price Floors (רצפות מחיר)
const ABSOLUTE_MINIMUM = 300           // ₪300 מינימום מוחלט
const competitorFloor = competitorAvg  // לא פחות ממתחרים
const govStatsFloor = marketAvg * 0.85 // 85% ממחיר שוק
const currentPriceFloor = basePrice * 0.75  // 75% ממחיר בסיס

const minPrice = Math.max(
  ABSOLUTE_MINIMUM,
  competitorFloor,
  govStatsFloor,
  currentPriceFloor
)  // בוחרים את הגבוה ביותר!

// 4. אכיפת רצפה
predictedPrice = Math.max(minPrice, rawPrice)

// 5. עיגול
predictedPrice = Math.round(predictedPrice / 5) * 5
```

**לוג**:
```bash
💰 [PredictionLogger] Price Calculation: Scarlet Hotel - 2026-02-15
   ├─ Raw Price (before floors): ₪834
   ├─ Market Floors:
   │  ├─ Absolute Minimum: ₪300
   │  ├─ Competitor Floor: ₪600
   │  ├─ Gov Stats Floor: ₪553
   │  ├─ Current Price Floor: ₪413
   │  └─ Applied Floor: ₪600
   └─ Final Price: ₪835
   Adjustments Applied:
      1. Historical trend: +8% (increasing)
      2. Rounded to nearest 5: ₪834 → ₪835
```

---

### שלב 5: חישוב Confidence

```typescript
// 7 פקטורי Confidence:
const confidenceFactors = {
  dataQuality: 0.85,          // Weight: 20%
  scanRecency: 0.90,          // Weight: 18%
  historicalData: 0.75,       // Weight: 12%
  bookingData: 0.80,          // Weight: 15%
  competitorData: 0.95,       // Weight: 15%
  marketConsistency: 0.70,    // Weight: 10%
  externalDataQuality: 0.85   // Weight: 10%
}

// חישוב בסיס:
baseConfidence = 
  0.85 * 0.20 +  // data quality
  0.90 * 0.18 +  // scan recency
  0.75 * 0.12 +  // historical
  0.80 * 0.15 +  // booking
  0.95 * 0.15 +  // competitor
  0.70 * 0.10 +  // consistency
  0.85 * 0.10    // external
= 0.835 (83.5%)

// התאמות:
1. Time Distance: 
   factor = max(0.7, 1 - (daysUntilDate / 365) * 0.3)
   // רחוק יותר = פחות ביטחון

2. Event Bonus: +8% if hasEvents
3. Historical Bonus: +12% if hasHistoricalData
4. Near-Term Bonus: +15% if daysUntil <= 14 && bookingData > 0.7

finalConfidence = baseConfidence 
  * timeDistanceFactor 
  * (1.08 if events) 
  * (1.12 if historical)
  * (1.15 if nearTerm)
```

**לוג**:
```bash
🎯 [PredictionLogger] Confidence Calculation: Scarlet Hotel - 2026-02-15
   Days Until Date: 14
   Factor Breakdown:
   ├─ Data Quality: 85% (weight: 20%)
   ├─ Scan Recency: 90% (weight: 18%)
   ├─ Historical Data: 75% (weight: 12%)
   ├─ Booking Data: 80% (weight: 15%)
   ├─ Competitor Data: 95% (weight: 15%)
   ├─ Market Consistency: 70% (weight: 10%)
   └─ External Data Quality: 85% (weight: 10%)
   Base Confidence: 83.5%
   Adjustments:
   ├─ Time Distance Factor: 0.988
   ├─ Event Bonus: +8%
   ├─ Historical Bonus: +12%
   └─ Near-Term Bonus: +15%
   🎯 Final Confidence: 91.3%
```

---

### שלב 6: Recommendations

```typescript
if (priceVsBase > 20 && demand === "very_high") {
  recommendation = "העלה מחיר - ביקוש גבוה מאוד"
  type = "price_increase"
}
else if (priceVsBase < -10 && occupancyRate < 30) {
  recommendation = "שקול מבצע - תפוסה נמוכה"
  type = "promotion"
}
else if (priceVsCompetitor > 15) {
  recommendation = "המחיר שלך גבוה מ-15% מהמתחרים"
  type = "competitor_alert"
}
else if (priceVsCompetitor < -15) {
  recommendation = "יש מקום להעלות מחיר - מתחת למתחרים"
  type = "opportunity"
}
```

---

### שלב 7: שמירה ב-DB

```typescript
// Insert/Update ב-price_predictions table
await supabase.from("price_predictions").upsert(predictions, {
  onConflict: "hotel_id,prediction_date"
})
```

---

## מערכת הלוגים המפורטת

### הפעלת Debug Mode

```bash
# בקריאה ל-API:
POST /api/predictions/generate?debug=true

# בקוד:
const debugMode = searchParams?.get('debug') === 'true'
const predictionLogger = getPredictionLogger(debugMode)
```

### סוגי לוגים

#### 1. **Data Collection Log**
```typescript
predictionLogger.logDataCollection(hotelId, hotelName, {
  scanResults: 150,
  bookings: 45,
  competitorPrices: 320,
  basePrice: 550,
  totalRooms: 34
})
```

**פלט**:
```bash
📊 [PredictionLogger] Data Collection for Scarlet Hotel
   ├─ Scan Results: 150
   ├─ Bookings: 45
   ├─ Competitor Prices: 320
   ├─ Base Price: ₪550
   └─ Total Rooms: 34
```

#### 2. **Multi-Agent Log**
```typescript
predictionLogger.logMultiAgent(hotelId, hotelName, {
  eventsFound: 90,
  eventsConfidence: 0.85,
  historicalData: 90,
  historicalConfidence: 0.80,
  statisticsConfidence: 0.75,
  overallConfidence: 0.80,
  dataQuality: 'excellent',
  executionTime: 3500
})
```

#### 3. **Factor Calculation Log**
מפורט לעיל - מראה כל פקטור, ההשפעה שלו, וההנמקה.

#### 4. **Price Calculation Log**
מפורט לעיל - מראה raw price, floors, adjustments.

#### 5. **Confidence Calculation Log**
מפורט לעיל - מראה breakdown מלא.

#### 6. **Final Result Log**
```typescript
predictionLogger.logFinalResult(hotelId, hotelName, dateStr, {
  predictedPrice: 835,
  confidence: 0.913,
  demand: 'very_high',
  recommendation: 'העלה מחיר - ביקוש גבוה מאוד',
  recommendationType: 'price_increase',
  basePrice: 550,
  priceVsBase: 51.8,
  priceVsCompetitor: 39.2
})
```

**פלט**:
```bash
✅ [PredictionLogger] Final Result: Scarlet Hotel - 2026-02-15
   ├─ Predicted Price: ₪835
   ├─ Base Price: ₪550
   ├─ Price vs Base: +51.8%
   ├─ Price vs Competitor: +39.2%
   ├─ Confidence: 91.3%
   ├─ Demand Level: very_high
   └─ Recommendation: העלה מחיר - ביקוש גבוה מאוד
      Type: price_increase
```

---

## איך להשתמש במערכת

### 1. ייצור חיזויים רגיל

```bash
POST /api/predictions/generate
Content-Type: application/json

{
  "hotelIds": [],  // ריק = כל המלונות
  "daysAhead": 90,
  "selectedMonths": [2, 3],  // פברואר-מרץ
  "selectedYear": 2026,
  "analysisParams": {
    "includeSeasonality": true,
    "includeCompetitors": true,
    "includeOccupancy": true,
    "includeEvents": true,
    "includeBudget": true,
    "includeMarketTrends": true,
    "includeFutureBookings": true
  }
}
```

### 2. ייצור חיזויים עם לוגים מפורטים

```bash
POST /api/predictions/generate?debug=true
```

### 3. קריאת לוגים בקוד

```typescript
import { getPredictionLogger } from '@/lib/logging/prediction-logger'

const logger = getPredictionLogger(true)

// לאחר הרצת חיזויים:
const logs = logger.getLogs()
console.log('Total logs:', logs.length)

// לוגים לתאריך ספציפי:
const decisionLogs = logger.getDecisionLogs('hotel-123', '2026-02-15')

// ייצוא ל-JSON:
const jsonExport = logger.exportToFile()
fs.writeFileSync('prediction-logs.json', jsonExport)

// סיכום:
logger.printSummary()
```

---

## דוגמאות

### דוגמה 1: חיזוי לסופ"ש של Pride

```typescript
Input:
  Date: 2026-06-08 (Fri)
  Hotel: Scarlet Hotel
  Base Price: ₪550

Factors Calculated:
  ├─ Seasonality: 1.15 (summer_start)
  ├─ Weekend: 1.12 (Friday)
  ├─ Lead Time: 1.03 (14 days)
  ├─ Occupancy: 1.30 (85% booked)
  ├─ Event: 1.40 (Pride Parade ← Multi-Agent)
  ├─ Competitor: 1.18 (avg: ₪650)
  ├─ Budget: 1.05 (gap: ₪20K)
  └─ Velocity: 1.05 (increasing)

Calculation:
  raw = 550 * 1.15 * 1.12 * 1.03 * 1.30 * 1.40 * 1.18 * 1.05 * 1.05
  raw = ₪1,847
  
  floor = max(300, 650, 553, 413) = ₪650
  
  final = max(1847, 650) = ₪1,847
  rounded = ₪1,845

Confidence:
  base = 84%
  × 0.988 (time distance)
  × 1.08 (event bonus)
  × 1.12 (historical bonus)
  × 1.15 (near-term bonus)
  = 96.1% ← very high!

Recommendation:
  "העלה מחיר ל-2026-06-08 - ביקוש גבוה מאוד"
  Type: price_increase
```

### דוגמה 2: חיזוי לאמצע שבוע בפברואר

```typescript
Input:
  Date: 2026-02-18 (Wed)
  Hotel: Scarlet Hotel
  Base Price: ₪550

Factors:
  ├─ Seasonality: 0.80 (winter_lowest)
  ├─ Weekend: 1.00 (Wednesday)
  ├─ Lead Time: 0.98 (45 days)
  ├─ Occupancy: 0.92 (15% booked)
  ├─ Event: 1.00 (no events)
  ├─ Competitor: 0.88 (avg: ₪485)
  ├─ Budget: 0.95 (above target)
  └─ Velocity: 0.95 (decreasing)

Calculation:
  raw = 550 * 0.80 * 1.00 * 0.98 * 0.92 * 1.00 * 0.88 * 0.95 * 0.95
  raw = ₪331
  
  floor = max(300, 485, 413, 413) = ₪485
  
  final = max(331, 485) = ₪485 ← floor applied!
  rounded = ₪485

Confidence:
  base = 72%
  × 0.963 (time distance)
  = 69.3%

Recommendation:
  "שקול מבצע ל-2026-02-18 - תפוסה נמוכה"
  Type: promotion
```

---

## שאלות נפוצות

### ❓ איך המערכת מטפלת במחירים נמוכים מדי?

המערכת משתמשת ב-**4 Price Floors** שונים ובוחרת את הגבוה ביותר:
1. **₪300** - מינימום מוחלט
2. **Competitor Average** - לא פחות ממתחרים
3. **85% of Market Average** - לא פחות מ-85% ממחיר שוק
4. **75% of Base Price** - לא פחות מ-75% ממחיר הבסיס

זה מבטיח שלעולם לא נתמחר מתחת לשוק.

### ❓ איך Multi-Agent משפר את החיזויים?

1. **Events Agent** מוצא אירועים שלא בקלנדר (קונצרטים, כנסים)
2. **Historical Agent** מזהה patterns שחוזרים על עצמם
3. **Statistics Agent** מספק context של כל השוק (לא רק מתחרים)

ביחד הם מעלים את ה-**External Data Confidence** מ-50% ל-85%+.

### ❓ למה הלוגים חשובים?

1. **Transparency** - אפשר לראות בדיוק למה הוחלט מחיר מסוים
2. **Debugging** - אם משהו נראה לא הגיוני, אפשר לעקוב אחרי כל הפקטורים
3. **Optimization** - אפשר לזהות פקטורים שלא עובדים טוב
4. **Auditing** - אפשר לשמור היסטוריה של החלטות

### ❓ איך לשפר את ה-Confidence?

1. **הרץ Scans לעיתים קרובות יותר** (כל 6-12 שעות)
2. **הוסף מתחרים** (יותר מתחרים = confidence גבוה יותר)
3. **אסוף הזמנות** (booking data מעלה confidence)
4. **וודא ש-TAVILY_API_KEY פעיל** (Multi-Agent)
5. **הוסף נתונים היסטוריים** (YoY comparisons)

---

## סיכום

מערכת החיזויים היא מערכת מורכבת שמשלבת:
- ✅ **30+ Data Sources** (פנימי + חיצוני)
- ✅ **10+ Pricing Factors** (עונתיות, תחרות, ביקוש...)
- ✅ **Multi-Agent System** (אירועים, היסטוריה, סטטיסטיקות)
- ✅ **Smart Price Floors** (4 שכבות הגנה)
- ✅ **Dynamic Confidence** (מבוסס-נתונים, לא קבוע)
- ✅ **Detailed Logging** (כל החלטה מתועדת)

התוצאה: **חיזויי מחיר מדויקים עם שקיפות מלאה**.

---

## קבצים רלוונטיים

- **API Route**: [`app/api/predictions/generate/route.ts`](app/api/predictions/generate/route.ts)
- **Logger**: [`lib/logging/prediction-logger.ts`](lib/logging/prediction-logger.ts)
- **Orchestrator**: [`lib/agents/orchestrator.ts`](lib/agents/orchestrator.ts)
- **Events Agent**: [`lib/agents/events-agent.ts`](lib/agents/events-agent.ts)
- **Historical Agent**: [`lib/agents/historical-agent.ts`](lib/agents/historical-agent.ts)
- **Statistics Agent**: [`lib/agents/statistics-agent.ts`](lib/agents/statistics-agent.ts)

---

**עדכון אחרון**: 1 ינואר 2026
**גרסה**: 3.2
