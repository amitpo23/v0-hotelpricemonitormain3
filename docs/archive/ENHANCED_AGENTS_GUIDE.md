# 🚀 Enhanced Multi-Agent Prediction System - Complete Guide

## סקירה כללית

המערכת משודרגת עם **6 agents חדשים** שמספקים נתונים אמיתיים ומקיפים לחיזוי מחירים:

### 🎯 Agents במערכת (סה"כ 9):

#### 1. **Trends Agent** 🆕 - Google Trends בזמן אמת
- **מקור**: SerpAPI (Google Trends API)
- **מה זה עושה**: מודד פופולריות חיפושים "מלון בתל אביב" בתאריכים שונים
- **פלט**: ציון 0-100 של עניין בחיפוש + מגמה (rising/falling/stable)
- **השפעה**: ציון גבוה = ביקוש גבוה = אפשר להעלות מחירים
- **Fallback**: אומדן סטטיסטי לפי עונה אם API לא זמין

#### 2. **Budget Agent** 🆕 - יעדי תקציב חכמים
- **מקור**: טבלת `budget_targets` + `revenue_tracking` + `bookings`
- **מה זה עושה**: משווה בין יעד תקציב חודשי להכנסות בפועל
- **פלט**: 
  - פער תקציב (₪)
  - לחץ תמחור (0.95-1.18x)
  - המלצות לסגירת פער
- **השפעה**: פער גדול = צריך להעלות מחירים, יעד הושג = אפשר אופטימיזציה
- **דוגמה**: "חסרים ₪50,000 ליעד החודשי → העלה מחירים ב-15%"

#### 3. **Velocity Agent** 🆕 - קצב הזמנות
- **מקור**: טבלת `bookings` (7/14/30 ימים אחרונים)
- **מה זה עושה**: מנתח קצב ההזמנות ומזהה מגמות
- **פלט**: 
  - מגמה (accelerating/increasing/stable/decreasing/declining)
  - ציון מהירות 0-100
  - השפעה על תמחור (0.90-1.10x)
- **השפעה**: קצב עולה = ביקוש חזק = העלה מחירים, קצב יורד = הפעל מבצעים
- **דוגמה**: "35 הזמנות ב-7 ימים (מגמה עולה) → העלה מחירים ב-8%"

#### 4. **Competitor Agent** 🆕 - מחירי מתחרים בזמן אמת
- **מקור**: 
  - **Real-time**: Apify scraping (Booking.com)
  - **Cached**: טבלת `scan_results` (עד 24 שעות)
- **מה זה עושה**: משווה מחירים מול מתחרים ישירים
- **פלט**: 
  - מחיר ממוצע בשוק
  - מיקום (lowest/below-average/average/above-average/highest)
  - המלצת תמחור
- **השפעה**: מחיר שלנו נמוך מדי = הפסד רווח, מחיר גבוה מדי = איבוד תפוסה
- **דוגמה**: "מחירך ₪450, ממוצע שוק ₪520 → יש מקום להעלות 15%"

#### 5. **Holidays Agent** 🆕 - חגים ישראליים
- **מקור**: Hebcal API + אירועים מקומיים קבועים
- **מה זה עושה**: מזהה חגים יהודיים ואירועי תל אביב מיוחדים
- **פלט**: 
  - רשימת חגים לכל תאריך
  - השפעת תיירות (1.0-1.45x)
  - תיאור החג
- **השפעה**: 
  - פסח: x1.4 (שיא שנתי)
  - מצעד גאווה: x1.4 (250,000 מבקרים)
  - סוכות: x1.25
  - שבת/חג: x1.1-1.2
- **דוגמה**: "18.04.2026 = פסח (יום 3/7) → העלה מחירים ב-40%"

#### 6. **Events Agent** ⚡ (שופר) - אירועים מ-Tavily
- **מקור**: Tavily Search API
- **מה זה עושה**: מחפש כנסים, קונצרטים, פסטיבלים בתל אביב
- **פלט**: 
  - אירועים לפי תאריך
  - השפעה (very_high/high/medium/low)
  - מספר משתתפים משוער
- **השפעה**: כנס בינלאומי = ביקוש גבוה = העלה מחירים
- **דוגמה**: "15.06.2026: Web Summit Tel Aviv (50,000 איש) → x1.35"

#### 7. **Historical Agent** (קיים) - מחירים היסטוריים
- **מקור**: טבלת `scan_results` + `daily_prices` (שנה שעברה)
- **מה זה עושה**: משווה תאריך נוכחי לאותו תאריך אשתקד
- **פלט**: 
  - מחיר אשתקד
  - שינוי באחוזים
  - מגמה (increasing/decreasing/stable)

#### 8. **Statistics Agent** (קיים) - נתוני CBS ותיירות
- **מקור**: לשכת הסטטיסטיקה, Tavily, נתוני ממשלה
- **מה זה עושה**: מחיר ממוצע ללילה בתל אביב, תחלואה כלכלית
- **פלט**: 
  - מחיר לילה ממוצע בשוק
  - אחוז תפוסה ממוצע
  - מגמות מאקרו

#### 9. **Orchestrator v2** (חדש!) - תאום כל ה-Agents
- מריץ את כל ה-agents במקביל ב-3 שלבים:
  1. **Stage 1 (מהיר)**: Budget, Velocity, Holidays
  2. **Stage 2 (בינוני)**: Historical, Statistics, Trends  
  3. **Stage 3 (איטי)**: Events, Competitors
- משקלל נתונים ומחשב ביטחון כולל
- מחליט אילו agents להריץ לפי טווח החיזוי

---

## 🎮 איך המערכת משתמשת בכל זה?

### תהליך חישוב מחיר מלא:

```
1. מחיר בסיס: ₪550 (מהמלון)

2. פקטורים עונתיים:
   - עונה: יולי (x1.25 - קיץ שיא)
   - סוף שבוע: כן (x1.12)
   - Lead time: 14 ימים (x1.03)
   ───────────────────────────
   → ₪550 * 1.25 * 1.12 * 1.03 = ₪794

3. פקטורים דינמיים:
   - תפוסה: 75% (x1.2 - לחץ גבוה)
   - חג/אירוע: מצעד גאווה (x1.4)
   - מתחרים: ממוצע ₪850 (x1.03 - אנחנו זולים)
   ───────────────────────────
   → ₪794 * 1.2 * 1.4 * 1.03 = ₪1,372

4. פקטורים עסקיים:
   - תקציב: פער -₪30k (x1.12 - לחץ תקציבי)
   - Velocity: 40 הזמנות/שבוע - עולה (x1.05)
   - Google Trends: ציון 92/100 (x1.02)
   ───────────────────────────
   → ₪1,372 * 1.12 * 1.05 * 1.02 = ₪1,641

5. רצפות מחיר (Floor Protection):
   - רצפה מוחלטת: ₪300
   - מתחרים: ₪850
   - סטטיסטיקה ממשלתית: ₪720
   - 75% ממחיר בסיס: ₪412
   ───────────────────────────
   → minPrice = max(300, 850, 720, 412) = ₪850
   
   → finalPrice = max(₪1,641, ₪850) = ₪1,641 ✅

6. עיגול:
   ₪1,641 → ₪1,640 (לקראטים של 5)
```

### מחיר סופי: **₪1,640**

---

## 📊 דוגמאות לפלט:

### דוגמה 1: יום רגיל
```
📅 Date: 2026-03-15 (Sunday)
🏷️  Base: ₪550
📊 Factors:
  - Season: Spring (x1.0)
  - Weekend: Yes (x1.12)
  - Occupancy: 45% (x1.02)
  - Events: None (x1.0)
  - Competitors Avg: ₪580 (x1.05)
  - Budget: On track (x1.0)
  - Velocity: Stable (x1.0)
  - Trends: 72/100 (x1.0)
💰 Raw: ₪550 * 1.12 * 1.02 * 1.05 = ₪660
🛡️  Floor: ₪580 (competitor avg)
✅ Final: ₪660
```

### דוגמה 2: פסח
```
📅 Date: 2026-04-18 (Thursday - Passover Day 3/7)
🏷️  Base: ₪550
📊 Factors:
  - Season: Passover Peak (x1.4)
  - Weekend: No (x1.0)
  - Occupancy: 95% (x1.3)
  - Holiday: Passover (x1.4) ✨
  - Events: None (x1.0)
  - Competitors Avg: ₪920 (x1.05)
  - Budget: -₪40k gap (x1.15)
  - Velocity: Accelerating (x1.08)
  - Trends: 95/100 (x1.03)
💰 Raw: ₪550 * 1.4 * 1.3 * 1.4 * 1.05 * 1.15 * 1.08 * 1.03 = ₪2,187
🛡️  Floor: ₪920 (competitor avg)
✅ Final: ₪2,185 (rounded)
🔥 PEAK PRICING - Very High Demand
```

### דוגמה 3: מצב קשה
```
📅 Date: 2026-02-10 (Tuesday)
🏷️  Base: ₪550
📊 Factors:
  - Season: Winter Low (x0.8)
  - Weekend: No (x1.0)
  - Occupancy: 18% (x0.85)
  - Events: None (x1.0)
  - Competitors Avg: ₪420 (x0.95)
  - Budget: +₪15k above target (x0.95)
  - Velocity: Declining (x0.93)
  - Trends: 55/100 (x0.98)
💰 Raw: ₪550 * 0.8 * 0.85 * 0.95 * 0.95 * 0.93 * 0.98 = ₪302
🛡️  Floor: ₪420 (competitor avg - APPLIED!)
✅ Final: ₪420
⚠️  Floor protected - don't undercut market
💡 Recommendation: Run promotions, boost marketing
```

---

## ⚙️ הגדרות API נדרשות

הוסף למשתני סביבה (`.env`):

```bash
# Google Trends (אופציונלי - יש fallback)
SERPAPI_KEY=your_serpapi_key

# Real-time Competitor Pricing (אופציונלי)
APIFY_API_TOKEN=your_apify_token
APIFY_ACTOR_ID=dtrungtin/booking-scraper

# Events Discovery (קיים)
TAVILY_API_KEY=your_tavily_key

# Database (קיים)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### מה קורה בלי API keys?
- **ללא SERPAPI**: משתמש באומדן עונתי (קונפידנס 40% במקום 90%)
- **ללא APIFY**: משתמש במחירים מה-DB (עד 24 שעות)
- **ללא TAVILY**: משתמש רק ב-Holidays Agent
- **המערכת תמשיך לעבוד!** רק עם קונפידנס נמוך יותר

---

## 🎯 מתי להשתמש בכל Agent?

| Timeframe | Agents לשימוש | Real-time? | הסבר |
|-----------|---------------|------------|------|
| 0-7 ימים | הכל | כן | צריך דיוק מקסימלי |
| 8-30 ימים | הכל | לא | מתחרים יכולים להשתנות |
| 30+ ימים | Events, Historical, Holidays, Trends | לא | Budget/Velocity לא רלוונטיים |

האורקסטרטור מחליט אוטומטית!

---

## 📈 מעקב וביטחון

### רמות ביטחון:
- **90-100%**: Excellent - כל המקורות זמינים
- **70-89%**: Good - רוב המקורות זמינים
- **50-69%**: Fair - חלק מהמקורות חסרים
- **0-49%**: Poor - רק נתונים בסיסיים

### Logs דוגמה:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 ENHANCED MULTI-AGENT ORCHESTRATOR v2 - STARTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Hotel: Scarlet Hotel (scarlet-tlv-001)
📍 Location: Tel Aviv
📅 Target dates: 90 dates
💰 Base price: ₪550
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STAGE 1: Quick Internal Data...
💰 [Budget Agent] Starting...
✅ [Budget Agent] Complete - Gap: ₪-15420, Pressure: 0.95x
🚀 [Velocity Agent] Starting...
✅ [Velocity Agent] Complete - Trend: increasing, Impact: 1.05x
🕎 [Holidays Agent] Starting...
✅ [Holidays Agent] Complete - 23 days with holidays
✨ Stage 1 complete in 1247ms

📈 STAGE 2: Historical & Market Data...
📜 [Historical Agent] Starting...
✅ [Historical Agent] Complete - 85 dates analyzed
📊 [Statistics Agent] Starting...
✅ [Statistics Agent] Complete - Avg rate: ₪680
📈 [Trends Agent] Starting...
✅ [Trends Agent] Complete - 90 dates with trends data
✨ Stage 2 complete in 8453ms

🌐 STAGE 3: External Data (Events & Competitors)...
🎉 [Events Agent] Starting...
✅ [Events Agent] Complete - 12 dates with events
🏨 [Competitor Agent] Starting...
✅ [Competitor Agent] Complete - 90 dates analyzed
✨ Stage 3 complete in 15829ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ORCHESTRATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Total time: 15829ms
📊 Data sources: budget_analysis, booking_velocity, israeli_holidays, historical_data, market_statistics, google_trends, tavily_events, competitor_prices
🎯 Overall confidence: 87%
⭐ Data quality: excellent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 איך להשתמש?

### בסיסי:
```bash
POST /api/predictions/generate
{
  "hotelIds": ["scarlet-tlv-001"],
  "predictionDays": 90,
  "selectedMonths": [4, 5, 6], // אפריל, מאי, יוני
  "selectedYear": 2026
}
```

### מתקדם (Real-time competitors):
```bash
POST /api/predictions/generate?realTimeCompetitors=true
{
  "hotelIds": ["scarlet-tlv-001"],
  "predictionDays": 7
}
```

---

## 🎉 סיכום

המערכת מספקת עכשיו **9 מקורות נתונים** שונים:
1. ✅ Google Trends (חדש!)
2. ✅ Budget Targets (חדש!)
3. ✅ Booking Velocity (חדש!)
4. ✅ Real-time Competitors (חדש!)
5. ✅ Israeli Holidays (חדש!)
6. ✅ Events (Tavily)
7. ✅ Historical Prices
8. ✅ Market Statistics
9. ✅ Orchestrator v2 (חדש!)

**התוצאה**: חיזוי מחירים חכם ומדויק המבוסס על **נתונים אמיתיים** ולא אומדנים!
