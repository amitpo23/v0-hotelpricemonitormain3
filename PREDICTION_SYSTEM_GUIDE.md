# מדריך מערכת החיזוי - Prediction System Guide

## סקירה כללית / Overview

מערכת חיזוי מחירים מבוססת AI שמשלבת נתוני תפוסה, תקציב, מתחרים ומודיעין שוק לחיזוי מחירים אופטימליים.

AI-powered price prediction system that integrates occupancy, budget, competitor data, and market intelligence for optimal pricing.

---

## דרישות מקדימות / Prerequisites

### 1. נתונים בסיסיים במסד הנתונים / Required Database Data

המערכת זקוקה לנתונים הבאים כדי לפעול:

✅ **מלונות (hotels)** - לפחות מלון אחד עם:
- `id` - מזהה ייחודי
- `name` - שם המלון
- `base_price` - מחיר בסיס
- `total_rooms` - מספר חדרים

✅ **סריקות מחירים (scans + competitor_daily_prices)** - נתונים עדכניים:
- סריקה שבוצעה ב-24 השעות האחרונות (מומלץ)
- מחירי מתחרים מתעדכנים

✅ **הזמנות (bookings)** - לחיזוי תפוסה:
- סטטוס: `confirmed`
- תאריכי check-in/check-out עתידיים

⚠️ **אופציונלי (Optional)**:
- תקציבים (revenue_budgets)
- תחזיות חודשיות (monthly_forecasts)
- סוגי חדרים (hotel_room_types)

### 2. משתני סביבה / Environment Variables

```bash
# חובה / Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# אופציונלי / Optional (לשיפור דיוק)
APIFY_API_KEY=your_apify_key
OPENWEATHER_API_KEY=your_weather_key
PERPLEXITY_API_KEY=your_perplexity_key
```

---

## הפעלת המערכת / System Operation

### שלב 1: גישה לדף החיזויים / Access Predictions Page

```
נווט ל: http://localhost:3000/predictions
Navigate to: http://localhost:3000/predictions
```

### שלב 2: יצירת חיזויים חדשים / Generate New Predictions

1. **לחץ על כפתור "Generate Predictions"**
   Click the "Generate Predictions" button

2. **בחר פרמטרים:**
   - **שנה (Year)**: בחר שנה עתידית (2026 מומלץ)
   - **חודשים (Months)**: בחר 3-6 חודשים עתידיים
   - **מלונות (Hotels)**: בחר את המלונות (או השאר ריק לכולם)

3. **דוגמה נכונה / Correct Example:**
   ```json
   {
     "selectedYear": 2026,
     "selectedMonths": [1, 2, 3],
     "hotelIds": ["your-hotel-id"]
   }
   ```

4. **❌ שגיאה נפוצה / Common Mistake:**
   ```json
   {
     "selectedYear": 2025,
     "selectedMonths": [12]  // ❌ חודש שעבר! Past month!
   }
   ```

### שלב 3: אימות החיזויים / Verify Predictions

אחרי יצירת החיזויים, בדוק:

✅ **במסך הראשי:**
- מספר חיזויים (Predictions count) > 0
- ביטחון ממוצע (Avg Confidence) > 70%
- טווח מחירים (Price Range) סביר

✅ **בלשוניות:**
- **Live / חי**: תחזיות חודשיות
- **Daily / יומי**: חיזויים יומיים + גרף
- **Revenue / הכנסות**: תחזית הכנסות
- **Monthly / חודשי**: ניתוח שנתי

---

## פתרון בעיות נפוצות / Troubleshooting

### בעיה 1: "No predictions yet" / אין חיזויים

**סיבות אפשריות:**
1. ✅ לא נוצרו חיזויים - לחץ "Generate Predictions"
2. ✅ החיזויים ישנים - הדף מציג רק `prediction_date >= today`
3. ✅ אין מלונות במסד - הוסף מלון אחד לפחות
4. ✅ שגיאה בבסיס נתונים - בדוק logs

**פתרון:**
```bash
# בדוק אם יש מלונות
SELECT id, name FROM hotels LIMIT 5;

# בדוק חיזויים קיימים
SELECT COUNT(*), MIN(prediction_date), MAX(prediction_date) 
FROM price_predictions 
WHERE prediction_date >= CURRENT_DATE;

# מחק חיזויים ישנים (אופציונלי)
DELETE FROM price_predictions WHERE prediction_date < CURRENT_DATE;
```

### בעיה 2: חיזויים לא מוצגים אחרי יצירה

**סיבה:** בחרת חודשים שכבר עברו!

**פתרון:**
- תאריך היום: **2025-12-29**
- ❌ אל תבחר: דצמבר 2025 (עבר!)
- ✅ בחר: ינואר-מרץ 2026

### בעיה 3: Confidence Score נמוך מדי

**גורמים להורדת ביטחון:**
- ⚠️ סריקה ישנה (>24 שעות)
- ⚠️ חסרים נתוני הזמנות
- ⚠️ חסרים מחירי מתחרים
- ⚠️ חסרים נתוני היסטוריה

**פתרון:**
1. הרץ סריקת מתחרים חדשה
2. הוסף נתוני הזמנות
3. המתן 24 שעות לאחר סריקה ראשונה

---

## API Endpoints

### יצירת חיזויים / Generate Predictions

```bash
POST /api/predictions/generate

# Body
{
  "selectedYear": 2026,
  "selectedMonths": [1, 2, 3],
  "hotelIds": ["hotel-id-1"],
  "daysAhead": 90,
  "analysisParams": {
    "includeCompetitors": true,
    "includeSeasonality": true,
    "includeEvents": true,
    "includeOccupancy": true,
    "includeBudget": true,
    "includeFutureBookings": true,
    "includeMarketTrends": true
  }
}
```

### תחזיות משופרות / Enhanced Predictions

```bash
POST /api/predictions/enhanced

# Body
{
  "hotelId": "hotel-id",
  "targetDate": "2026-01-15",
  "currentPrice": 500,
  "location": "Tel Aviv"
}
```

### AI Insights

```bash
POST /api/predictions/ai-insights

# Body
{
  "hotelId": "hotel-id",
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-03-31"
  }
}
```

---

## שיפורים שבוצעו / Recent Improvements

### ✅ אינטגרציות חדשות:
1. **Medici Hotels API** - 15 קבצים
   - חיפוש מלונות ומחירים
   - ניהול הזמנות והזדמנויות
   - סנכרון נתונים

2. **Apify Integration** - 5 קבצים
   - סריקה אוטומטית
   - Webhooks לעדכון נתונים
   - Audit logging

3. **Advanced Scrapers** - 7 קבצים
   - Puppeteer עם anti-bot
   - ScraperAPI לVercel
   - אלגוריתמי חיזוי מתקדמים

### ✅ תיקוני אבטחה:
- הסרת API keys מקודדים
- תיקון פרצת timing attack
- תיקון נתיבים מוחלטים

---

## מבנה הקוד / Code Structure

```
app/
├── api/predictions/
│   ├── generate/route.ts      # יצירת חיזויים עיקרי
│   ├── enhanced/route.ts      # חיזויים משופרים
│   ├── ai-insights/route.ts   # תובנות AI
│   └── advanced/route.ts      # אלגוריתמים מתקדמים
│
├── predictions/
│   ├── page.tsx                    # דף ראשי
│   ├── live-predictions.tsx        # תצוגה חיה
│   ├── prediction-chart.tsx        # גרפים
│   ├── enhanced-prediction-card.tsx # כרטיסי חיזוי
│   └── generate-button.tsx         # כפתור יצירה

lib/
├── prediction-algorithms.ts    # אלגוריתמי ליבה
├── advanced-predictions.ts     # חישובים מתקדמים
├── scraper-wrapper.ts          # מנהל scrapers
└── medici/                     # Medici integration
```

---

## Best Practices

### 1. תדירות עדכון / Update Frequency

- 🔄 **חיזויים**: צור מחדש כל 7 ימים
- 🔄 **סריקות**: הרץ פעם ביום (לפחות)
- 🔄 **תפוסה**: עדכן אוטומטית עם כל הזמנה

### 2. בחירת חודשים / Month Selection

✅ **מומלץ:**
- 3-6 חודשים קדימה
- התחל מהחודש הבא
- כלול עונות מיוחדות

❌ **להימנע:**
- חודשים שעברו
- יותר מ-12 חודשים קדימה
- חודש נוכחי (בסוף החודש)

### 3. ניטור איכות / Quality Monitoring

בדוק מדי יום:
- Data Freshness < 24h
- Avg Confidence > 70%
- Price Range סביר
- Recommendations count > 0

---

## תמיכה / Support

### Debug Mode

להפעלת מצב debug, הוסף למשתני סביבה:
```bash
DEBUG=true
LOG_LEVEL=debug
```

### Logs חשובים

```bash
# בדוק logs של יצירת חיזויים
grep "[v0]" logs/*.log

# בדוק שגיאות Supabase
grep "Supabase.*error" logs/*.log

# בדוק סטטוס נתונים
grep "Data Sources" logs/*.log
```

### קבצי בדיקה / Test Scripts

```bash
# בדיקת מערכת
node check-prediction-system.mjs

# בדיקת חיזויים משופרים
node test-enhanced-predictions.mjs

# בדיקת עדכון ל-DB
node test-prediction-to-db.mjs
```

---

## סיכום / Summary

**לתפעול תקין של המערכת:**

1. ✅ וודא שיש נתונים במסד (מלונות, סריקות, הזמנות)
2. ✅ הגדר משתני סביבה נכון
3. ✅ צור חיזויים לחודשים **עתידיים** בלבד
4. ✅ עדכן סריקות באופן קבוע (יומי)
5. ✅ בדוק Data Freshness ו-Confidence
6. ✅ השתמש ב-API endpoints המתאימים
7. ✅ נטר logs לזיהוי בעיות

**זכור:** המערכת מציגה רק חיזויים עתידיים (`prediction_date >= today`). אם יצרת חיזויים לדצמבר 2025 והיום 29/12, רק 2 ימים יופיעו!

---

## קישורים מהירים / Quick Links

- 📊 [דף חיזויים / Predictions Page](http://localhost:3000/predictions)
- 📈 [דף שוק / Market Intelligence](http://localhost:3000/market-intel)
- 🏨 [ניהול מלונות / Hotels](http://localhost:3000/hotels)
- 📅 [תפוסה / Occupancy](http://localhost:3000/calendar)
- 💰 [תקציב / Budget](http://localhost:3000/budget)

---

**גרסה:** 3.2  
**עודכן:** 2025-12-29  
**תמיכה:** ראה BRANCH_CONSOLIDATION_REPORT.md לפרטים נוספים
