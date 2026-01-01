# מערכת הלוגים - מדריך שימוש

## ✅ כן! הלוגים מחוברים לחלוטין ל-UI

### איך זה עובד:

#### 1. **הטבלה Predictions** (דף /predictions)
בכל שורה יש כפתור **"Logs"** עם אייקון 📄:
```
| Hotel | Date | Price | Confidence | Demand | Actions |
|-------|------|-------|------------|--------|---------|
| Scarlet | 2026-01-15 | ₪435 | 78% | low | [📄 Logs] |
```

#### 2. **לחיצה על כפתור Logs** פותחת חלון דיאלוג עם **6 טאבים מפורטים**:

##### 📊 **Tab 1: סקירה (Overview)**
- מחיר מחויה: ₪435
- Confidence: 78.5%
- רמת ביקוש: low
- נתוני קלט:
  - תוצאות סריקה: 500
  - הזמנות: 184
  - מחירי מתחרים: 369
  - חדרים תפוסים: 5/18
  - מתחרים ממוצע: ₪412
  - סריקה אחרונה: 24 שעות
- המלצה (אם יש): "שקול מבצע - תפוסה נמוכה"

##### 🤖 **Tab 2: Multi-Agent**
```
Data Quality: excellent
Overall Confidence: 85%

Events Agent (Tavily):
  - 3 אירועים נמצאו
  - Confidence: 92%
  - רשימה:
    • Pride Parade - 2026-06-08 (Impact: 1.4x)
    • Tel Aviv Marathon - 2026-01-15 (Impact: 1.25x)

Historical Agent:
  - 28 תאריכים היסטוריים
  - Confidence: 80%
  - Trend: +15% YoY

Statistics Agent:
  - Market Avg Price: ₪485
  - Confidence: 75%

Budget Agent:
  - Budget Gap: -₪12,500
  - Pressure: 0.95x

Velocity Agent:
  - Trend: increasing
  - Bookings Last 7 Days: 23
  - Impact: 1.08x

Competitors Agent:
  - 15 תאריכים
  - Avg Price: ₪412
  - Confidence: 88%

Holidays Agent:
  - 8 חגים
  - Confidence: 95%
```

##### 📐 **Tab 3: פקטורים (Factors)**
רשימה מפורטת של כל 10 הפקטורים:

```
1. Seasonality: 0.85 (עונה רגילה)
   Impact: ⬇️ Medium
   Reasoning: "חורף - עונת שפל"
   Calculation: -15%

2. Weekend Premium: 1.0 (אמצע שבוע)
   Impact: → Low
   Reasoning: "אמצע שבוע - ללא פרמיה"

3. Lead Time: 0.95 (15 ימים)
   Impact: ⬇️ Medium
   Reasoning: "טווח קצר - הנחה קלה"

4. Occupancy: 0.92 (27.8%)
   Impact: ⬇️ High
   Reasoning: "תפוסה נמוכה - לחץ למכירה"

5. Events: 1.25 (Marathon)
   Impact: ⬆️ High
   Reasoning: "מרתון תל אביב - ביקוש גבוה"

6. Competitor: 0.98 (₪412 avg)
   Impact: ⬇️ Medium
   Reasoning: "מחיר מעט מעל שוק"

7. Budget: 0.95 (Gap: -₪12,500)
   Impact: ⬇️ Medium
   Reasoning: "לחץ תקציבי קל"

8. Velocity: 1.08 (23 bookings/7d)
   Impact: ⬆️ Medium
   Reasoning: "מגמת הזמנות עולה"

9. Historical: 1.15 (YoY +15%)
   Impact: ⬆️ High
   Reasoning: "שנה שעברה מחיר גבוה יותר"

10. Market Trend: 1.02 (Google Trends: 68)
    Impact: ⬆️ Low
    Reasoning: "מגמת חיפוש חיובית קלה"
```

##### 💰 **Tab 4: מחיר (Price Calculation)**
```
Base Price: ₪550

Step-by-Step Calculation:
1. Raw Price = Base × All Factors
   = ₪550 × 0.85 × 1.0 × 0.95 × 0.92 × 1.25 × 0.98 × 0.95 × 1.08 × 1.15 × 1.02
   = ₪550 × 1.167
   = ₪642

2. Historical Trend Adjustment: +5%
   = ₪642 × 1.05
   = ₪674

3. Floor Prices (Minimum Enforcement):
   • Absolute Floor: ₪300
   • Competitor Floor: ₪412 (avg of competitors)
   • Gov Stats Floor: ₪412 (Tel Aviv market)
   • Current Price Floor: ₪385 (75% of recent avg)
   
   Applied Floor: ₪412 (highest)

4. Final Price Check:
   Raw: ₪674 vs Floor: ₪412
   → Raw is higher, floor not applied

5. Rounding (nearest 5):
   ₪674 → ₪675

Final Price: ₪675
```

##### 🎯 **Tab 5: Confidence**
```
Base Factors (Weighted):
  • Data Quality: 0.85 × 0.20 = 0.170
  • Scan Recency: 0.90 × 0.18 = 0.162
  • Historical Data: 0.80 × 0.12 = 0.096
  • Booking Data: 0.75 × 0.15 = 0.112
  • Competitor Data: 0.88 × 0.15 = 0.132
  • Market Consistency: 0.70 × 0.10 = 0.070
  • External Data Quality: 0.85 × 0.10 = 0.085
  
Base Confidence: 0.827 (82.7%)

Adjustments:
  • Time Distance (15 days): 0.96x
  • Event Bonus (Marathon): +8%
  • Historical Bonus (YoY data): +12%
  • Near-term Bonus: -

Final Confidence: 0.827 × 0.96 × 1.08 × 1.12
                = 0.785 (78.5%)
```

##### ✅ **Tab 6: תוצאה (Result)**
```
Predicted Price: ₪675
Base Price: ₪550
Confidence: 78.5%
Demand Level: medium

Price vs Base: +22.7% (₪125 above base)
Price vs Competitor: +63.8% (₪263 above avg competitor)

Recommendation Type: price_optimization
Message: "מחיר אופטימלי - איזון בין ביקוש למרווח"

Algorithm Version: 3.2
Execution Time: 2,347 ms
```

---

## 🔧 איך להשתמש:

### שלב 1: צור חיזויים
1. לך לדף `/predictions`
2. בחר שנה וחודשים
3. לחץ **"Generate Predictions"**
4. המתן עד שהחיזויים נוצרים

### שלב 2: צפה בלוגים
1. מצא את השורה של החיזוי שמעניין אותך
2. לחץ על כפתור **"📄 Logs"** בעמודת Actions
3. החלון ייפתח עם כל הפרטים

### שלב 3: נווט בין הטאבים
- **סקירה** - קבל תמונה מהירה
- **Multi-Agent** - ראה מה כל Agent תרם
- **פקטורים** - הבן איך כל פקטור השפיע
- **מחיר** - עקוב אחרי החישוב צעד אחר צעד
- **Confidence** - הבן למה רמת הביטחון היא X%
- **תוצאה** - סיכום כולל

---

## ⚠️ הערה חשובה:

הלוגים נשמרים **רק עבור**:
1. **5 התאריכים הראשונים** בכל הרצה
2. **כל התאריכים** כאשר `?debug=true` מופעל

### איך להפעיל debug mode:
```bash
curl -X POST "http://localhost:3000/api/predictions/generate?debug=true" \
  -H "Content-Type: application/json" \
  -d '{"selectedYear": 2026, "selectedMonths": [1]}'
```

או הוסף `?debug=true` ל-URL בדפדפן.

---

## 🗄️ דרישה: טבלת prediction_logs

אם טבלת `prediction_logs` לא קיימת ב-Supabase:

1. פתח **Supabase Dashboard**
2. עבור ל-**SQL Editor**
3. הרץ את הקובץ `create-prediction-logs-table.sql`
4. לחץ **Run**

הטבלה תיווצר עם כל ה-JSONB columns הנדרשים.

---

## ✅ סיכום

**כן! הכל מחובר ועובד:**
- ✅ כפתור Logs בטבלה
- ✅ חלון דיאלוג מפורט
- ✅ 6 טאבים עם מידע מלא
- ✅ API endpoint עובד
- ✅ שמירה אוטומטית ל-Supabase
- ✅ הצגה יפה עם צבעים, אייקונים, כיוון RTL

**תראה LOG מלא** של כל חיזוי עם כל שלבי החישוב! 🎉
