# Accuracy Measurement Improvements - Task 1 Complete ✅

## מה שונה

### 1. טבלת Ground Truth: `daily_actual_prices`
**בעיה הישנה:** היינו משווים תחזיות ל-bookings, אבל booking price ≠ selling price. לא תפסנו שינויי מחיר ידניים או no-shows.

**הפתרון:**
- טבלה חדשה: `daily_actual_prices` (מחירי מכירה בפועל)
- שדות: `actual_price`, `rooms_sold`, `total_revenue`, `source`, `data_quality`
- תומך במקורות: manual, PMS, Booking.com, Expedia
- Data quality score: 1.0 = verified, 0.6 = inferred, 0.5 = estimated

**קובץ:** `supabase/migrations/20260106_create_daily_actual_prices.sql`

---

### 2. Weighted MAPE במקום MAPE פשוט
**בעיה הישנה:** כל התאריכים קיבלו משקל שווה. שגיאה ב-Tuesday עם 20% תפוסה = שגיאה ב-Saturday עם 95% תפוסה.

**הפתרון:**
```typescript
function calculateDateWeight(date, demandLevel, occupancyRate) {
  let weight = 1.0
  
  // High demand = more weight (we care more about accuracy here)
  if (occupancyRate > 90) weight = 2.0
  else if (occupancyRate > 75) weight = 1.5
  else if (occupancyRate < 30) weight = 0.7  // Low occupancy less critical
  
  // Weekends get more weight
  if (isFridayOrSaturday) weight *= 1.2
  
  return weight
}
```

**תוצאה:** Accuracy score מדויק יותר - נותן priority לימים קריטיים.

---

### 3. Data Source & Quality Tracking
**בעיה הישנה:** לא ידענו אם המידע אמין או רק הערכה.

**הפתרון:**
- שלושה עמודות חדשות ב-`prediction_accuracy`:
  - `data_source`: actual_prices / bookings_fallback / manual
  - `data_quality`: 0-1 (כמה אמין הנתון)
  - `date_weight`: המשקל שנתנו לתאריך הזה ב-MAPE

**שימוש:**
- מזהים ימים עם נתונים חלשים
- מתריעים רק על שגיאות בנתונים אמינים
- מחשבים weighted MAPE: `totalWeightedError / totalWeight`

---

### 4. API Endpoint: `/api/actual-prices`
**מה זה עושה:** מאפשר עדכון מחירי מכירה ממשיים (manual או automated).

**שימוש:**
```bash
# Single update
POST /api/actual-prices
{
  "hotel_id": "uuid",
  "date": "2026-01-05",
  "actual_price": 450,
  "rooms_sold": 12,
  "source": "booking_com",
  "notes": "Weekend with event"
}

# Batch update
POST /api/actual-prices
[
  { "hotel_id": "...", "date": "2026-01-01", ... },
  { "hotel_id": "...", "date": "2026-01-02", ... }
]

# Get actual prices
GET /api/actual-prices?hotelId=xxx&startDate=2026-01-01&endDate=2026-01-31
```

**תשובה כוללת:**
- Stats: avgPrice, avgRoomsSold, totalRevenue
- Data sources breakdown
- Quality distribution (high/medium/low)

---

### 5. עדכון `/api/learning/accuracy`
**שינויים:**
1. **Fallback hierarchy:**
   - קודם מחפש ב-`daily_actual_prices` (ground truth)
   - אם לא קיים → fallback ל-`bookings` (פחות אמין)
   - מסמן data_source + data_quality

2. **Weighted MAPE:**
   - כל prediction מקבל weight לפי חשיבותו
   - MAPE = `totalWeightedError / totalWeight`
   - דיוק יותר נכון (לא מנופח)

3. **Alerts משופרים:**
   - 🔴 High-weight dates עם שגיאה
   - 🟡 Low-weight dates עם שגיאה
   - כולל: date, predicted, actual, error%, weight, source

---

## איך להשתמש

### Step 1: Run Migrations (חובה!)
```sql
-- בדשבורד של Supabase → SQL Editor:
-- 1. supabase/migrations/20260106_create_daily_actual_prices.sql
-- 2. supabase/migrations/20260106_add_accuracy_tracking_columns.sql
```

### Step 2: Feed Actual Prices
```bash
# אופציה 1: Manual (via admin UI - צריך לבנות)
# אופציה 2: API call
curl -X POST https://nightsinheaven.com/api/actual-prices \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "xxx",
    "date": "2026-01-05",
    "actual_price": 450,
    "rooms_sold": 12,
    "source": "manual"
  }'

# אופציה 3: PMS Integration (עתידי)
# אוטומטית ידחוף מחירים מ-PMS כל לילה
```

### Step 3: Wait for Cron
- Cron רץ יומית ב-03:00: `/api/learning/accuracy`
- ישווה predictions vs actual prices
- ישמור ב-`prediction_accuracy` עם weights + quality

### Step 4: Analyze Results
```bash
# Check accuracy improvements
GET /api/learning/accuracy?hotelId=xxx&days=30

# Response includes:
{
  "totalPredictions": 120,
  "avgAccuracy": 78.5,  // Weighted MAPE based
  "trend": "improving",
  "recommendations": [
    "Good accuracy (78%)",
    "Continue monitoring"
  ]
}
```

---

## תוצאות צפויות

### Immediate (Week 1)
- ✅ יש infrastructure למדידה נכונה
- ⚠️ Accuracy יירד בהתחלה (כי עכשיו מודדים נכון!)
- 📊 נראה איפה באמת יש שגיאות

### Short-term (Week 2-4)
- 📈 +20-30% דיוק במדידה (לא במודל - במדידה!)
- 🎯 זיהוי factors חלשים (איזה agent טועה יותר)
- 🔧 Data-driven decisions למשימה 2 (Feature Weight Tuning)

### Long-term (Month 2-3)
- 🚀 Foundation למשימות 2-5
- 🤖 Auto-tuning של weights לפי accuracy history
- 💰 +10-15% real accuracy improvement (במודל עצמו)

---

## קבצים שנוצרו/שונו

### Created
- ✅ `supabase/migrations/20260106_create_daily_actual_prices.sql`
- ✅ `supabase/migrations/20260106_add_accuracy_tracking_columns.sql`
- ✅ `app/api/actual-prices/route.ts`
- ✅ `test-accuracy-improvements.mjs`
- ✅ `ACCURACY_IMPROVEMENTS_TASK1.md` (זה!)

### Modified
- ✅ `app/api/learning/accuracy/route.ts` (130 שורות שונו)
  - Added: `calculateDateWeight()`
  - Updated: `calculateAccuracy()` with weights
  - Changed: comparison logic to use `daily_actual_prices`
  - Added: data_source/quality tracking

---

## Next: Task 2 - Feature Weight Tuning
אחרי שיצטבר data במשך שבוע-שבועיים, נוכל:
1. לרוץ regression על `prediction_accuracy`
2. למצוא optimal weights לכל factor (weekend, occupancy, competitor, etc.)
3. לשמור ב-`factor_weights` table
4. לעדכן `prediction-algorithms.ts` להשתמש ב-dynamic weights

**ROI צפוי:** +10-15% accuracy improvement (real, not measurement)
