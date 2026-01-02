# 🧠 Automated Learning & Improvement System

## סקירה כללית

המערכת כוללת **תהליך למידה אוטומטי מלא** שבודק את דיוק החיזויים, משווה למציאות, ומשפר את המודל באופן מתמיד.

## 📊 מה המערכת עושה?

### 1. **בדיקת דיוק אוטומטית** (`/api/learning/accuracy`)
- **מתי רץ**: כל יום ב-3:00 בלילה (Vercel Cron)
- **מה קורה**:
  - משווה חיזויי מחיר למחירים בפועל
  - משווה חיזויי תפוסה לתפוסה בפועל (מספר הזמנות / חדרים)
  - מחשב accuracy score עבור כל חיזוי
  - שומר את התוצאות בטבלה `prediction_accuracy`
  - מזהה שגיאות גדולות ומייצר אזהרות

**נוסחת דיוק**:
```typescript
errorPercent = Math.abs((predicted - actual) / actual) * 100
accuracyScore = Math.max(0, 100 - errorPercent)

// Overall accuracy (weighted):
overallAccuracy = (priceAccuracy * 0.6) + (occupancyAccuracy * 0.4)
```

**דוגמה**:
- חיזוי: ₪800, בפועל: ₪850
- Error: 5.88%
- Accuracy: 94.12% ✅

### 2. **רענון חיזויים אוטומטי** (`/api/learning/refresh-predictions`)
- **מתי רץ**: כל יום ב-2:00 בלילה (Vercel Cron)
- **מה קורה**:
  - מייצר מחדש חיזויים ל-90 הימים הבאים
  - משתמש בנתונים העדכניים ביותר (מחירי מתחרים, הזמנות)
  - מיישם לקחים מבדיקות הדיוק
  - שומר לוג של כל רענון בטבלה `prediction_generation_logs`

### 3. **סיכום ביצועים** (`model_performance_summary`)
- **מתי מתעדכן**: אחרי כל בדיקת דיוק
- **מה נשמר**:
  - דיוק ממוצע לפי תקופה (יומי/שבועי/חודשי)
  - התפלגות דיוקים (מצוין/טוב/בינוני/חלש)
  - יום הטוב ביותר ויום הגרוע ביותר
  - מגמות לאורך זמן

### 4. **דאשבורד למידה** (`/learning`)
- **ממשק UI** למעקב אחרי:
  - ✅ דיוק ממוצע
  - 📈 מגמות (משתפר/יורד/יציב)
  - 💡 המלצות לשיפור
  - 📋 רשימת חיזויים אחרונים מול מציאות
  - 📊 התפלגות דיוקים
  - 🕐 רענון אחרון

## 🗄️ מבנה נתונים

### טבלה: `prediction_accuracy`
```sql
CREATE TABLE prediction_accuracy (
  -- Prediction info
  hotel_id TEXT NOT NULL,
  prediction_date DATE NOT NULL,
  prediction_made_at TIMESTAMPTZ NOT NULL,
  prediction_id UUID,
  
  -- Predicted values
  predicted_price NUMERIC(10,2),
  predicted_occupancy NUMERIC(5,2),
  predicted_demand TEXT,
  
  -- Actual values
  actual_price NUMERIC(10,2),
  actual_occupancy NUMERIC(5,2),
  actual_bookings INTEGER,
  actual_revenue NUMERIC(10,2),
  
  -- Accuracy metrics
  price_error_percent NUMERIC(5,2),
  occupancy_error_percent NUMERIC(5,2),
  accuracy_score NUMERIC(5,2),
  
  -- Context
  prediction_confidence NUMERIC(5,2),
  factors_used JSONB,
  days_before_date INTEGER,
  
  -- Metadata
  actual_data_updated_at TIMESTAMPTZ,
  
  PRIMARY KEY (hotel_id, prediction_date, prediction_made_at)
);
```

### טבלה: `model_performance_summary`
```sql
CREATE TABLE model_performance_summary (
  hotel_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Aggregated metrics
  total_predictions INTEGER,
  predictions_with_actuals INTEGER,
  avg_accuracy_score NUMERIC(5,2),
  avg_price_error_percent NUMERIC(5,2),
  avg_occupancy_error_percent NUMERIC(5,2),
  
  -- Distribution
  very_accurate_count INTEGER, -- >90%
  accurate_count INTEGER,      -- 75-90%
  moderate_count INTEGER,      -- 60-74%
  poor_count INTEGER,          -- <60%
  
  -- Best/worst
  best_prediction_day DATE,
  best_prediction_score NUMERIC(5,2),
  worst_prediction_day DATE,
  worst_prediction_score NUMERIC(5,2),
  
  PRIMARY KEY (hotel_id, period_start, period_end, period_type)
);
```

### טבלה: `prediction_generation_logs`
```sql
CREATE TABLE prediction_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'started', 'in_progress', 'completed', 'failed'
  predictions_generated INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## 🔄 תהליך הלמידה המלא

```
┌─────────────────────────────────────────────────────┐
│  Day 1: Generate Predictions                        │
│  - Price for next 90 days                          │
│  - Occupancy estimates                             │
│  - Confidence scores                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Day 2-90: Wait for actual data                    │
│  - Bookings come in                                │
│  - Actual prices recorded                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Daily at 3 AM: Check Accuracy                     │
│  - Compare predictions vs actuals                  │
│  - Calculate accuracy scores                       │
│  - Identify patterns in errors                     │
│  - Generate recommendations                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Daily at 2 AM: Refresh Predictions                │
│  - Use latest booking trends                       │
│  - Apply lessons from accuracy checks              │
│  - Adjust factor weights if needed                 │
│  - Generate new 90-day predictions                 │
└─────────────────────────────────────────────────────┘
```

## 🎯 קריטריונים לדיוק

| Accuracy Score | רמה | פעולה |
|---------------|-----|-------|
| 90-100% | 🟢 מצוין | המשך כרגיל |
| 80-89% | 🔵 טוב מאוד | מעקב קבוע |
| 70-79% | 🟡 טוב | הוסף מקורות נתונים |
| 60-69% | 🟠 בינוני | בדוק משקלות פקטורים |
| 0-59% | 🔴 חלש | צריך אימון מחדש |

## 📈 מדדי הצלחה

המערכת מודדת:

1. **דיוק מחיר** (60% ממשקל הדיוק):
   - עד כמה המחיר החזוי קרוב למחיר בפועל
   - יעד: <15% שגיאה

2. **דיוק תפוסה** (40% ממשקל הדיוק):
   - עד כמה התפוסה החזויה קרובה לבפועל
   - יעד: <20% שגיאה

3. **מגמת שיפור**:
   - האם הדיוק משתפר לאורך זמן?
   - מחשב השוואה בין חצי אחרון לחצי ראשון

4. **עקביות**:
   - האם הדיוק יציב או משתנה בצורה קיצונית?
   - מודד סטיית תקן של הדיוקים

## 🚀 איך להשתמש?

### 1. צפייה בדאשבורד למידה
```
http://localhost:3000/learning
```

### 2. בדיקת דיוק ידנית (עבור 7 ימים אחרונים)
```bash
curl -X POST http://localhost:3000/api/learning/accuracy?daysBack=7
```

**תשובה**:
```json
{
  "success": true,
  "predictionsChecked": 42,
  "accuracyUpdated": 38,
  "avgAccuracy": 87.3,
  "improvements": [
    "Updated 38 predictions - data available for model improvement"
  ],
  "alerts": [
    "High price error on 2024-01-15: predicted ₪850, actual ₪720 (15.3% off)"
  ]
}
```

### 3. רענון חיזויים ידני
```bash
curl -X POST http://localhost:3000/api/learning/refresh-predictions
```

### 4. קבלת אינסייטים
```bash
curl http://localhost:3000/api/learning/accuracy?days=30
```

## ⚙️ הגדרות Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/learning/accuracy",
      "schedule": "0 3 * * *",
      "description": "Check prediction accuracy vs actuals - Daily at 3 AM"
    },
    {
      "path": "/api/learning/refresh-predictions",
      "schedule": "0 2 * * *",
      "description": "Refresh predictions for next 90 days - Daily at 2 AM"
    }
  ]
}
```

**⚠️ חשוב לפרודקשן:**
- Vercel Cron דורש **Pro plan** ומעלה
- כל ה-Cron endpoints מאומתים עם `CRON_SECRET`
- יש להגדיר `CRON_SECRET` ב-Vercel Environment Variables
- קרא את `VERCEL_DEPLOYMENT.md` להדרכה מלאה

## 🔍 טיפולוגיית שגיאות

המערכת מזהה דפוסים:

### 1. **שגיאות מחיר גבוהות (>20%)**
- **סימפטום**: המחיר החזוי שונה מאוד מהמחיר בפועל
- **סיבות אפשריות**:
  - מחירי מתחרים לא מעודכנים
  - אירוע מיוחד לא צפוי (חג/כנס)
  - שינוי במדיניות תמחור של המלון
- **פתרון**: הגדל משקל של seasonal_factors, בדוק competitor_data

### 2. **שגיאות תפוסה גבוהות (>30%)**
- **סימפטום**: תפוסה בפועל שונה מהתחזית
- **סיבות אפשריות**:
  - מגמת הזמנות השתנתה
  - מבצע/קמפיין פרסום לא ידוע
  - ביטולים רבים
- **פתרון**: הגדל משקל של booking_analytics, בדוק booking_window

### 3. **דיוק יורד לאורך זמן**
- **סימפטום**: דיוק היה טוב אבל הולך ויורד
- **סיבות אפשריות**:
  - השוק משתנה
  - נתוני מתחרים לא מעודכנים
  - מודל לא מתאים למציאות החדשה
- **פתרון**: אימון מחדש, הוסף פקטורים חדשים

### 4. **דיוק משתנה בין ימים**
- **סימפטום**: יום אחד מצוין, יום אחר גרוע
- **סיבות אפשריות**:
  - אירועים חריגים (לא נמצאים במערכת)
  - איכות נתונים משתנה
- **פתרון**: שפר event detection, הוסף manual events

## 💡 המלצות המערכת

בהתבסס על דיוק ממוצע, המערכת מייצרת המלצות:

| Accuracy | המלצה |
|----------|-------|
| <70% | 🔴 "Low accuracy - Consider re-training with recent data" |
| 70-80% | 🟡 "Moderate accuracy - Add more competitor data sources" |
| 80-90% | 🟢 "Good accuracy - Continue monitoring for consistency" |
| >90% | ✅ "Excellent accuracy - System optimal" |

## 🎛️ כיול והתאמה

### שינוי משקלות פקטורים ב-Orchestrator

ניתן לשנות את המשקל של כל פקטור בהתבסס על accuracy:

```typescript
// lib/ai/orchestrator.ts
const factors = {
  competitor_prices: 0.25,  // הגדל אם שגיאות מחיר גבוהות
  historical_occupancy: 0.20,
  seasonal_trends: 0.15,    // הגדל אם errors בחגים/סופשבוע
  booking_analytics: 0.15,  // הגדל אם errors בתפוסה
  market_demand: 0.15,
  events: 0.10              // הגדל אם יש אירועים רבים
}
```

### התאמת Confidence Score

ב-Revenue Calculator (`lib/calculations/revenue-calculator.ts`):

```typescript
function calculateConfidence(factors) {
  return {
    dataQuality: 25,      // משקל לאיכות נתונים
    scanRecency: 20,      // משקל לעדכניות סריקה
    historicalData: 20,   // משקל לנתונים היסטוריים
    competitorData: 15,   // משקל למתחרים
    bookingWindow: 10,    // משקל לחלון הזמנות
    marketConsistency: 10 // משקל לעקביות שוק
  }
}
```

## 📱 אינטגרציות עתידיות

רעיונות להרחבה:

1. **Slack/Email Alerts**:
   - שלח התראה כשדיוק יורד מתחת ל-70%
   - שלח דו"ח שבועי עם סיכום ביצועים

2. **A/B Testing**:
   - הרץ 2 מודלים במקביל
   - השווה דיוק
   - בחר באוטומטי את המודל הטוב יותר

3. **Auto-tuning**:
   - אימון אוטומטי של משקלות הפקטורים
   - Machine Learning על historical accuracy
   - אופטימיזציה של hyperparameters

4. **Real-time Learning**:
   - עדכן חיזויים ברגע שנכנסת הזמנה חדשה
   - למידה מיידית מכל אינטראקציה

## 🔐 אבטחה

- **Cron endpoints** מוגנים ע"י Vercel Cron authentication
- **GET endpoints** פתוחים לקריאה (למעקב internal)
- **POST endpoints** דורשים authentication (כשתיעשה integration)

## 📊 דוגמת Flow מלא

```
1. Jan 1, 2024 02:00 AM
   → Refresh predictions generated
   → Predictions for Jan 1 - Mar 31, 2024

2. Jan 2, 2024 - Bookings come in for Jan 1
   → booking_id: 123, price: ₪850, room: 101

3. Jan 2, 2024 03:00 AM
   → Accuracy check runs
   → Finds prediction for Jan 1: ₪800
   → Actual: ₪850
   → Error: 5.88%, Accuracy: 94.12%
   → Updates prediction_accuracy table

4. Jan 2, 2024 02:00 AM (next day)
   → Refresh predictions runs
   → Learns: Jan 1 was underestimated
   → Adjusts future similar days slightly upward
   → Generates new predictions

5. Every week
   → model_performance_summary updated
   → Shows trend: improving 📈
```

## 🎯 מטרות

- ✅ **אוטומציה מלאה** - אין צורך בהתערבות ידנית
- ✅ **למידה מתמדת** - המערכת משתפרת כל יום
- ✅ **שקיפות** - כל החלטה מתועדת ונראית
- ✅ **מדידה** - כל מדד נמדד ומוצג בדאשבורד
- ✅ **התראות** - שגיאות גדולות מזוהות מיד

---

**סטטוס**: ✅ **מערכת למידה אוטומטית פעילה**

**Cron Jobs**:
- ✅ Accuracy check - Daily at 3 AM
- ✅ Prediction refresh - Daily at 2 AM

**Dashboard**: `/learning`
