# 🗺️ מפת זרימת הנתונים במערכת - הסבר מפורט

## 📊 **1. איפה הנתונים נשמרים?**

### **א. טבלאות עיקריות:**

#### **`competitor_daily_prices`** - ⭐ כאן אני שומר את הנתונים שסרקתי! ⭐
```sql
CREATE TABLE competitor_daily_prices (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),          -- המלון שלנו
  competitor_id UUID REFERENCES hotel_competitors(id),  -- מתחרה ספציפי
  date DATE NOT NULL,                            -- תאריך check-in
  price NUMERIC,                                 -- מחיר בפועל
  source TEXT,                                   -- "Booking.com", "Expedia", etc
  room_type TEXT,                                -- סוג חדר
  room_name TEXT,                                -- שם מדויק של החדר
  availability BOOLEAN DEFAULT true,
  scraped_at TIMESTAMP DEFAULT NOW(),            -- מתי נסרק
  
  UNIQUE (competitor_id, date, source, room_type)  -- ⚠️ מניעת duplicates
);
```

**זה שומר:**
- ✅ מחיר בפועל של מתחרה ספציפי
- ✅ תאריך ספציפי (check-in date)
- ✅ מקור (Booking.com/APIFY)
- ✅ סוג חדר + שם חדר
- ✅ זמן הסריקה

**דוגמה מהנתונים שחילצנו:**
```
hotel_id: 716e1e8f-3537-4f67-875d-de3a89642175
competitor_id: <A23 Boutique Hotel ID>
date: 2026-02-07
price: 178
source: "Booking.com"
room_type: "Standard Room"
scraped_at: 2025-12-26 19:40:00
```

---

#### **`competitor_price_history`** - היסטוריית שינויי מחירים 📈
```sql
CREATE TABLE competitor_price_history (
  id UUID PRIMARY KEY,
  hotel_id UUID,
  competitor_id UUID,
  date DATE NOT NULL,
  old_price NUMERIC,              -- המחיר הישן
  new_price NUMERIC,              -- המחיר החדש
  price_change NUMERIC,           -- ההפרש (new - old)
  change_percent NUMERIC,         -- אחוז השינוי
  source TEXT,
  room_type TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

**זה שומר:**
- ✅ **שינויי מחירים בין סריקה לסריקה**
- ✅ מתי המחיר השתנה
- ✅ באיזה אחוז המחיר עלה/ירד
- ✅ **משמש ללמידה על דינמיקת התמחור של מתחרים**

**דוגמה:**
```
אם A23 Boutique עלה מ-178 EUR ל-199 EUR ב-2026-02-07:
old_price: 178
new_price: 199
price_change: +21
change_percent: +11.8%
recorded_at: 2025-12-27 10:00:00
```

---

#### **`daily_prices`** - המחירים שלנו + המלצות 🎯
```sql
CREATE TABLE daily_prices (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  date DATE NOT NULL,
  room_type_id UUID REFERENCES hotel_room_types(id),
  
  our_price NUMERIC,                    -- המחיר שלנו כרגע
  recommended_price NUMERIC,            -- המחיר המומלץ (מהאלגוריתם)
  
  min_competitor_price NUMERIC,         -- מחיר מתחרה הזול ביותר
  max_competitor_price NUMERIC,         -- מחיר מתחרה היקר ביותר
  avg_competitor_price NUMERIC,         -- ממוצע מחירי מתחרים
  
  demand_level TEXT,                    -- "high", "medium", "low"
  occupancy_forecast NUMERIC,           -- חיזוי תפוסה (%)
  price_recommendation TEXT,            -- "increase", "decrease", "hold"
  autopilot_action TEXT,                -- פעולה אוטומטית
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (hotel_id, date, room_type_id)
);
```

**זה שומר:**
- ✅ המחיר שלנו vs המלצה מהמערכת
- ✅ סטטיסטיקות מתחרים (min/max/avg)
- ✅ המלצת מחיר מבוססת AI
- ✅ **משמש ל-UI - הקלנדר מראה את הנתונים האלה**

---

#### **`price_predictions`** - חיזויי מחירים עתידיים 🔮
```sql
CREATE TABLE price_predictions (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  prediction_date DATE NOT NULL,        -- לאיזה תאריך החיזוי
  predicted_price NUMERIC NOT NULL,     -- המחיר החזוי
  base_price NUMERIC,
  predicted_demand TEXT,                -- ביקוש חזוי
  confidence_score NUMERIC,             -- רמת ביטחון (0-1)
  recommendation TEXT,                  -- המלצה טקסטואלית
  recommendation_type TEXT,             -- "increase", "decrease", etc
  factors JSONB,                        -- פקטורים שהשפיעו על החיזוי
  created_at TIMESTAMP DEFAULT NOW()
);
```

**זה שומר:**
- ✅ **חיזויים עתידיים (60-90 ימים קדימה)**
- ✅ מחיר מומלץ עתידי
- ✅ ביקוש חזוי
- ✅ **משמש לתכנון אסטרטגי ותחזיות**

---

#### **`monthly_forecasts`** - תחזיות חודשיות 📅
```sql
CREATE TABLE monthly_forecasts (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  predicted_revenue NUMERIC,            -- הכנסה חזויה
  predicted_occupancy NUMERIC,          -- תפוסה חזויה
  predicted_adr NUMERIC,                -- ADR חזוי (Average Daily Rate)
  predicted_revpar NUMERIC,             -- RevPAR חזוי
  predicted_room_nights INTEGER,        -- לילות חדר חזויים
  
  budget_revenue NUMERIC,               -- תקציב מתוכנן
  budget_occupancy NUMERIC,
  budget_variance_percent NUMERIC,      -- % סטייה מתקציב
  on_track_for_budget BOOLEAN,          -- האם על המסלול?
  
  market_avg_occupancy NUMERIC,         -- ממוצע שוק
  market_avg_adr NUMERIC,
  competitor_avg_price NUMERIC,
  
  factors JSONB,                        -- פקטורים
  confidence_score NUMERIC DEFAULT 0.75,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**זה שומר:**
- ✅ **תחזיות ברמת חודש שלם**
- ✅ השוואה לתקציב
- ✅ מדדי KPI (ADR, RevPAR, Occupancy)
- ✅ **משמש לדשבורד ניהולי ודוחות**

---

### **ב. טבלאות מטא-דאטה:**

#### **`hotels`** - רשימת המלונות
```sql
CREATE TABLE hotels (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  base_price NUMERIC,
  total_rooms INTEGER DEFAULT 50,
  created_at TIMESTAMP
);
```

#### **`hotel_competitors`** - רשימת מתחרים
```sql
CREATE TABLE hotel_competitors (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id),
  competitor_hotel_name TEXT NOT NULL,
  booking_url TEXT,
  expedia_url TEXT,
  star_rating INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_color TEXT DEFAULT '#f97316',  -- צבע להצגה ב-UI
  created_at TIMESTAMP
);
```

---

## 🔄 **2. זרימת הנתונים - מסריקה לUI**

### **שלב 1: סריקה (Scraping)**
```
1. הסקריפט scan-per-competitor.mjs מפעיל סריקה
2. קורא ל-API: POST /api/scans/execute
3. השרת מפעיל את scraper_v5.py
4. Playwright/APIFY גורפים את Booking.com
5. התוצאה: { price: 178, roomType: "Standard Room", currency: "EUR" }
```

### **שלב 2: שמירה ב-DB**
```javascript
// מ: app/api/scans/execute/route.ts
const competitorPrices = [];

for (const room of scrapedResult.rooms) {
  competitorPrices.push({
    hotel_id: hotelData.id,
    competitor_id: competitor.id,
    date: dateStr,
    price: room.price,
    source: "Booking.com",
    room_type: room.roomType,
    availability: true,
    scraped_at: new Date().toISOString()
  });
}

// Batch insert ל-competitor_daily_prices
await supabase
  .from('competitor_daily_prices')
  .upsert(competitorPrices, {
    onConflict: 'competitor_id,date,source,room_type'
  });
```

### **שלב 3: זיהוי שינויי מחירים**
```javascript
// מ: app/api/scraper/run-full/route.ts
// אם מצאנו מחיר קודם לאותו תאריך:
if (oldPrice && oldPrice !== newPrice) {
  priceHistoryRecords.push({
    competitor_id: competitor.id,
    date: dateStr,
    old_price: oldPrice,
    new_price: newPrice,
    price_change: newPrice - oldPrice,
    change_percent: ((newPrice - oldPrice) / oldPrice) * 100,
    source: "Booking.com",
    recorded_at: new Date().toISOString()
  });
}

// שמירה ל-competitor_price_history
await supabase
  .from('competitor_price_history')
  .insert(priceHistoryRecords);
```

### **שלב 4: יצירת המלצות ל-daily_prices**
```javascript
// מ: app/api/calendar/generate/route.ts
// חישוב סטטיסטיקות מתחרים
const avgCompetitor = prices.reduce((sum, p) => sum + p, 0) / prices.length;
const minCompetitor = Math.min(...prices);
const maxCompetitor = Math.max(...prices);

// קביעת המלצה
let recommendedPrice = avgCompetitor;
let priceRecommendation = "hold";
let autopilotAction = "hold";

if (ourPrice < avgCompetitor * 0.9) {
  priceRecommendation = "Increase - below market average";
  autopilotAction = "increase";
  recommendedPrice = avgCompetitor * 0.95;
} else if (ourPrice > avgCompetitor * 1.1) {
  priceRecommendation = "Decrease - above market average";
  autopilotAction = "decrease";
  recommendedPrice = avgCompetitor * 1.05;
}

// שמירה ל-daily_prices
await supabase.from('daily_prices').upsert({
  hotel_id: hotelId,
  room_type_id: roomType.id,
  date: dateStr,
  our_price: ourPrice,
  recommended_price: recommendedPrice,
  min_competitor_price: minCompetitor,
  max_competitor_price: maxCompetitor,
  avg_competitor_price: avgCompetitor,
  demand_level: demandLevel,
  price_recommendation: priceRecommendation,
  autopilot_action: autopilotAction,
  updated_at: new Date().toISOString()
}, {
  onConflict: 'hotel_id,date,room_type_id'
});
```

### **שלב 5: יצירת חיזויים**
```javascript
// מ: app/api/predictions/generate/route.ts
const predictions = [];

for (let i = 0; i < 60; i++) {  // 60 ימים קדימה
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + i);
  
  // שימוש ב-competitor_daily_prices + competitor_price_history
  const historicalData = await getHistoricalPrices(targetDate);
  const priceChanges = await getPriceChanges(targetDate);
  
  // אלגוריתם חיזוי
  const predictedPrice = calculatePrediction({
    basePrice: hotel.base_price,
    avgCompetitorPrice: historicalData.avg,
    priceChangeVelocity: priceChanges.avgChangePercent,
    dayOfWeek: targetDate.getDay(),
    daysUntilDate: i
  });
  
  predictions.push({
    hotel_id: hotel.id,
    prediction_date: targetDate.toISOString().split('T')[0],
    predicted_price: predictedPrice,
    predicted_demand: demandLevel,
    confidence_score: 0.85,
    factors: {
      competitor_avg: historicalData.avg,
      price_trend: priceChanges.trend,
      day_of_week: targetDate.getDay()
    }
  });
}

// שמירה ל-price_predictions
await supabase.from('price_predictions').upsert(predictions);
```

### **שלב 6: תחזיות חודשיות**
```javascript
// מ: app/api/forecasts/generate/route.ts
const forecasts = [];

for (let month = 1; month <= 12; month++) {
  // חישוב מדדים
  const predictedRevenue = avgDailyRate * expectedRoomNights;
  const predictedOccupancy = (expectedRoomNights / totalAvailableRoomNights) * 100;
  const predictedADR = avgDailyRate;
  const predictedRevPAR = (predictedRevenue / totalRooms) / daysInMonth;
  
  forecasts.push({
    hotel_id: hotel.id,
    year: 2026,
    month: month,
    predicted_revenue: predictedRevenue,
    predicted_occupancy: predictedOccupancy,
    predicted_adr: predictedADR,
    predicted_revpar: predictedRevPAR,
    budget_revenue: budgets[month]?.target_revenue,
    budget_variance_percent: variancePercent,
    on_track_for_budget: variancePercent > -10,
    competitor_avg_price: competitorAvg,
    confidence_score: 0.75
  });
}

// שמירה ל-monthly_forecasts
await supabase.from('monthly_forecasts').upsert(forecasts);
```

---

## 🎨 **3. איך המערכת מציגה את הנתונים ב-UI?**

### **א. הקלנדר (Calendar View)**
**קובץ:** `app/calendar/calendar-grid.tsx`

```typescript
// טוען נתונים מ-3 טבלאות:
const { data: dailyPrices } = await supabase
  .from('daily_prices')
  .select('*')
  .gte('date', startDate)
  .lte('date', endDate);

const { data: competitorDailyPrices } = await supabase
  .from('competitor_daily_prices')
  .select('*, hotel_competitors(*)')
  .gte('date', startDate)
  .lte('date', endDate);

const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .gte('check_in', startDate);

// להציג בקלנדר:
{dailyPrices.map(day => (
  <CalendarCell key={day.date}>
    <div>המחיר שלנו: ₪{day.our_price}</div>
    <div>ממוצע מתחרים: ₪{day.avg_competitor_price}</div>
    <div className={getBadgeColor(day.demand_level)}>
      {day.demand_level}
    </div>
    <div>המלצה: {day.price_recommendation}</div>
    
    {/* מחירי מתחרים */}
    {competitorDailyPrices
      .filter(p => p.date === day.date)
      .map(price => (
        <CompetitorBadge 
          name={price.hotel_competitors.competitor_hotel_name}
          price={price.price}
          color={price.hotel_competitors.display_color}
        />
      ))
    }
  </CalendarCell>
))}
```

**התוצאה בUI:**
```
┌─────────────────────┐
│   7 פברואר 2026     │
├─────────────────────┤
│ המחיר שלנו: ₪650   │
│ ממוצע: ₪678        │
│ [HIGH DEMAND] 🔥    │
│ המלצה: Increase    │
├─────────────────────┤
│ 🟠 A23: ₪178       │
│ 🟡 Arbel: ₪192     │
│ 🔵 Dizengoff: ₪160 │
└─────────────────────┘
```

---

### **ב. הדשבורד (Dashboard)**
**קובץ:** `app/dashboard/page.tsx`

```typescript
// טוען נתונים מריכוזיים:
const { data: recentScans } = await supabase
  .from('scans')
  .select('*, scan_results(*)')
  .order('created_at', { ascending: false })
  .limit(5);

const { data: predictions } = await supabase
  .from('price_predictions')
  .select('*')
  .order('prediction_date', { ascending: true })
  .limit(30);

const { data: competitorPrices } = await supabase
  .from('competitor_daily_prices')
  .select('price')
  .gte('date', today)
  .lte('date', nextWeek);

// חישובים:
const avgNightlyRate = bookings.reduce((sum, b) => sum + b.revenue, 0) / bookings.length;
const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length;
const priceTrend = ((avgNightlyRate - avgCompetitorPrice) / avgCompetitorPrice) * 100;

// UI:
<Card>
  <h3>המחיר שלנו</h3>
  <div>₪{avgNightlyRate.toFixed(0)}</div>
</Card>

<Card>
  <h3>ממוצע מתחרים</h3>
  <div>₪{avgCompetitorPrice.toFixed(0)}</div>
</Card>

<Card>
  <h3>המיקום שלנו בשוק</h3>
  <div>{priceTrend > 0 ? '▲' : '▼'} {Math.abs(priceTrend).toFixed(1)}%</div>
</Card>
```

---

### **ג. דף חיזויים (Predictions Page)**
**קובץ:** `app/predictions/page.tsx`

```typescript
// טוען חיזויים:
const { data: predictions } = await supabase
  .from('price_predictions')
  .select('*')
  .gte('prediction_date', today)
  .order('prediction_date', { ascending: true });

const { data: forecasts } = await supabase
  .from('monthly_forecasts')
  .select('*')
  .eq('year', currentYear);

// UI - גרף חיזויים:
<LineChart data={predictions.map(p => ({
  date: p.prediction_date,
  predicted: p.predicted_price,
  demand: p.predicted_demand,
  confidence: p.confidence_score
}))} />

// טבלת תחזיות חודשיות:
<Table>
  {forecasts.map(f => (
    <tr>
      <td>{f.month}</td>
      <td>₪{f.predicted_revenue.toLocaleString()}</td>
      <td>{f.predicted_occupancy.toFixed(1)}%</td>
      <td>₪{f.predicted_adr.toFixed(0)}</td>
      <td className={f.on_track_for_budget ? 'text-green' : 'text-red'}>
        {f.budget_variance_percent.toFixed(1)}%
      </td>
    </tr>
  ))}
</Table>
```

---

### **ד. דף אנליטיקס (Analytics Page)**
**קובץ:** `app/analytics/page.tsx`

```typescript
// טוען היסטוריה:
const { data: priceHistory } = await supabase
  .from('competitor_price_history')
  .select('*')
  .gte('recorded_at', thirtyDaysAgo)
  .order('recorded_at', { ascending: true });

// ניתוח טרנדים:
const trends = analyzeTrends(priceHistory);

// UI - גרפי שינויי מחירים:
<BarChart 
  data={trends.map(t => ({
    competitor: t.competitor_name,
    avgChange: t.avgPriceChange,
    changeFrequency: t.changeCount,
    trend: t.trend  // "increasing", "decreasing", "stable"
  }))}
/>

// אלרטים:
{trends
  .filter(t => t.avgChange > 10)  // שינויים משמעותיים
  .map(t => (
    <Alert severity="warning">
      {t.competitor_name} העלה מחירים ב-{t.avgChange.toFixed(1)}% ב-30 הימים האחרונים
    </Alert>
  ))
}
```

---

## 🧠 **4. שימוש בנתונים ללמידה וחיזויים**

### **א. אלגוריתמי חיזוי**
**קובץ:** `lib/prediction-algorithms.ts`

```typescript
export function predictPrice(input: {
  basePrice: number,
  competitorPrices: number[],
  priceChangeHistory: PriceChange[],
  dayOfWeek: number,
  daysUntilDate: number,
  seasonalFactor: number
}): number {
  
  // 1. ממוצע מתחרים משוקלל
  const avgCompetitor = input.competitorPrices.reduce((sum, p) => sum + p, 0) 
    / input.competitorPrices.length;
  
  // 2. מהירות שינוי מחירים (velocity)
  const recentChanges = input.priceChangeHistory
    .slice(-10)  // 10 האחרונים
    .map(c => c.change_percent);
  const avgVelocity = recentChanges.reduce((sum, c) => sum + c, 0) / recentChanges.length;
  
  // 3. פקטור יום בשבוע
  const weekendMultiplier = [5, 6].includes(input.dayOfWeek) ? 1.15 : 1.0;
  
  // 4. פקטור booking window
  let bookingWindowMultiplier = 1.0;
  if (input.daysUntilDate < 7) {
    bookingWindowMultiplier = 1.1;  // last-minute premium
  } else if (input.daysUntilDate > 60) {
    bookingWindowMultiplier = 0.95; // early-bird discount
  }
  
  // 5. חישוב סופי
  const predictedPrice = 
    avgCompetitor * 
    (1 + avgVelocity / 100) *  // טרנד מחירים
    weekendMultiplier *
    bookingWindowMultiplier *
    input.seasonalFactor;
  
  return Math.round(predictedPrice);
}
```

### **ב. למידה מהיסטוריה**
```typescript
// מ: app/api/predictions/advanced/route.ts
export async function learnFromHistory(hotelId: string) {
  // 1. שליפת כל ההיסטוריה
  const { data: history } = await supabase
    .from('competitor_price_history')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('recorded_at', { ascending: true });
  
  // 2. ניתוח דפוסים
  const patterns = {
    weekendPremium: 0,
    seasonalVariation: {},
    competitorBehavior: {},
    priceElasticity: 0
  };
  
  // 3. חישוב ממוצעים לפי יום בשבוע
  const byDayOfWeek = groupBy(history, h => new Date(h.date).getDay());
  for (const [day, records] of Object.entries(byDayOfWeek)) {
    patterns.weekendPremium += calculateAvgChange(records);
  }
  
  // 4. זיהוי התנהגות מתחרים
  const byCompetitor = groupBy(history, h => h.competitor_id);
  for (const [compId, records] of Object.entries(byCompetitor)) {
    patterns.competitorBehavior[compId] = {
      avgChangePercent: records.reduce((sum, r) => sum + r.change_percent, 0) / records.length,
      changeFrequency: records.length,
      volatility: calculateStdDev(records.map(r => r.change_percent)),
      trend: detectTrend(records)  // "increasing", "decreasing", "stable"
    };
  }
  
  // 5. שימוש בדפוסים לחיזוי עתידי
  return patterns;
}
```

---

## 📈 **5. דוגמה מלאה: מסריקה לחיזוי**

### **יום 1: סריקה ראשונה**
```
1. סריקה:
   - A23 Boutique: 178 EUR (2026-02-07)
   - Arbel: 192 EUR (2026-02-07)
   
2. שמירה ב-competitor_daily_prices:
   ✅ 2 רשומות נשמרו

3. יצירת daily_prices:
   - our_price: 650
   - avg_competitor_price: 185
   - recommended_price: 700
   - price_recommendation: "Increase"
```

### **יום 2: סריקה שנייה (אותו תאריך)**
```
1. סריקה:
   - A23 Boutique: 199 EUR (2026-02-07)  ⬆️ +21 EUR
   - Arbel: 192 EUR (2026-02-07)         ➡️ ללא שינוי
   
2. זיהוי שינוי:
   old_price: 178 → new_price: 199
   price_change: +21
   change_percent: +11.8%
   
3. שמירה ב-competitor_price_history:
   ✅ רשומת שינוי נשמרה
   
4. עדכון daily_prices:
   - avg_competitor_price: 195.5 (עלה!)
   - recommended_price: 720 (עלה בהתאם)
```

### **יום 3: יצירת חיזוי**
```
1. האלגוריתם קורא:
   - competitor_daily_prices (מחירים נוכחיים)
   - competitor_price_history (טרנדים)
   
2. חישוב:
   - Avg competitor: 195.5 EUR
   - Price velocity: +11.8% per week
   - Predicted for 2026-03-07 (30 days ahead):
     195.5 * (1 + 0.118) * 1.15 (weekend) = 252 EUR
   
3. שמירה ב-price_predictions:
   prediction_date: 2026-03-07
   predicted_price: 252
   confidence_score: 0.85
   factors: {
     base_competitor_avg: 195.5,
     price_velocity: 11.8,
     weekend_factor: 1.15
   }
```

### **יום 4: הצגה ב-UI**
```
הקלנדר מציג:
┌──────────────────────────┐
│ 7 פברואר 2026           │
├──────────────────────────┤
│ ✅ המחיר שלנו: ₪720    │
│ 📊 ממוצע: ₪195.5       │
│ 🔥 HIGH DEMAND          │
│ 📈 המלצה: Increase     │
├──────────────────────────┤
│ COMPETITOR PRICES:       │
│ 🟠 A23: ₪199 (▲11.8%)  │
│ 🟡 Arbel: ₪192 (➡️)    │
└──────────────────────────┘

דף חיזויים מציג:
┌──────────────────────────┐
│ PREDICTION: 7 מרץ 2026  │
├──────────────────────────┤
│ Predicted: ₪252         │
│ Confidence: 85%         │
│ Demand: HIGH            │
│ Factors:                │
│  • Competitor avg: ₪195 │
│  • Trend: +11.8%/week   │
│  • Weekend: +15%        │
└──────────────────────────┘
```

---

## ✅ **סיכום התשובות לשאלותיך:**

### **1. לאן אני שומר?**
- ✅ **`competitor_daily_prices`** - מחירי מתחרים (הנתונים מהסריקות)
- ✅ **`competitor_price_history`** - שינויי מחירים
- ✅ **`daily_prices`** - המחירים שלנו + המלצות
- ✅ **`price_predictions`** - חיזויים עתידיים
- ✅ **`monthly_forecasts`** - תחזיות חודשיות

### **2. האם שומר שינויי מחירים?**
- ✅ **כן!** טבלת `competitor_price_history` שומרת:
  - מחיר ישן → מחיר חדש
  - הפרש
  - אחוז שינוי
  - זמן השינוי

### **3. האם משתמש בזה ללמידה?**
- ✅ **כן!** האלגוריתמים משתמשים ב:
  - `competitor_price_history` - ללמוד על טרנדים
  - `competitor_daily_prices` - לזהות דפוסים
  - שניהם יחד - לחזות מחירים עתידיים

### **4. האם אני מכיר את הסכימה?**
- ✅ **כן!** יש לי:
  - `docs/database-schema.json` - תיעוד מלא
  - `scripts/001_create_hotel_tables.sql` - SQL להקמה
  - הבנה מלאה של הקשרים בין הטבלאות

### **5. איך מוצג ב-UI?**
- ✅ **קלנדר:** מחירים יומיים + מתחרים + המלצות
- ✅ **דשבורד:** סיכום + טרנדים + KPIs
- ✅ **חיזויים:** גרפים + טבלאות תחזיות
- ✅ **אנליטיקס:** היסטוריה + שינויים + אלרטים

---

**🎯 התוצאה הסופית:**
כל סריקה → שמירת מחירים → זיהוי שינויים → למידה מדפוסים → חיזוי עתידי → המלצות → הצגה ב-UI
