# 🤖 מערכת עדכון תחזיות אוטומטי

## סקירה כללית

מערכת אוטומטית שרצה **כל שעה** ומעדכנת תחזיות מחירים לשנה קדימה על בסיס:
- ✅ נתוני מתחרים אחרונים (30 יום)
- ✅ אלגוריתמים משופרים (demand, seasonal, competitor)
- ✅ חישובי ביטחון דינמיים
- ✅ צבירה חודשית אוטומטית

---

## 🎯 מה המערכת עושה?

### כל שעה (בדיוק):
1. **אוסף נתונים** - שואב 30 יום אחרונים של מחירי מתחרים
2. **מחשב סטטיסטיקות** - ממוצע, מינימום, מקסימום, טרנד
3. **מייצר תחזיות** - 365 תחזיות יומיות לשנה קדימה
4. **מחשב ביטחון** - רמת ביטחון לכל תחזית
5. **צובר חודשית** - 12 תחזיות חודשיות
6. **שומר ב-DB** - מעדכן טבלאות price_predictions ו-monthly_forecasts

---

## 📊 אלגוריתם התחזית

### נוסחה בסיסית:
```javascript
מחיר_מומלץ = מחיר_בסיס × ביקוש × עונתיות × (1 + השפעת_מתחרים)
```

### רכיבים:

#### 1. Demand Forecast (ביקוש)
- **בסיס:** 1.0 (ניטרלי)
- **גורמים:**
  - יום בשבוע (סופ"ש +10%)
  - חודש בשנה (קיץ +20%, חורף -10%)
  - טרנד נוכחי (עליה/ירידה במחירים)

#### 2. Seasonal Multiplier (עונתיות)
- **ינואר-מרץ:** 0.9 (עונת שפל)
- **אפריל-יוני:** 1.1 (עונה בינונית)
- **יולי-אוגוסט:** 1.3 (עונת שיא)
- **ספטמבר-נובמבר:** 1.0 (עונה רגילה)
- **דצמבר:** 1.2 (חגים)

#### 3. Competitor Influence (השפעת מתחרים)
```javascript
השפעה = (מחיר_ממוצע_מתחרים - מחיר_שלנו) / מחיר_שלנו
מכפיל = 1 + (השפעה × 0.1)  // 10% משקל למתחרים
```

#### 4. Confidence Level (רמת ביטחון)
```javascript
ביטחון_בסיס = 1.0 - (ימים_קדימה / 365) × 0.3
ביטחון_נתונים = נקודות_נתונים >= 50 ? 1.0 : 0.85
ביטחון_סופי = ביטחון_בסיס × ביטחון_נתונים
```

---

## 🗄️ מבנה הנתונים

### טבלה: `price_predictions`
365 שורות (תחזיות יומיות):
```sql
{
  hotel_id: UUID,
  date: DATE,                    -- תאריך התחזית
  predicted_price: INTEGER,      -- מחיר מומלץ ב-₪
  confidence_level: FLOAT,       -- 0.5-1.0
  demand_forecast: FLOAT,        -- 0.8-1.4
  seasonal_multiplier: FLOAT,    -- 0.9-1.3
  competitor_influence: FLOAT,   -- -0.2 to +0.2
  prediction_factors: JSONB,     -- פרטים נוספים
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### טבלה: `monthly_forecasts`
12 שורות (תחזיות חודשיות):
```sql
{
  hotel_id: UUID,
  month: STRING,                    -- "2026-01"
  predicted_avg_price: INTEGER,    -- ממוצע חודשי
  predicted_min_price: INTEGER,    -- מינימום
  predicted_max_price: INTEGER,    -- מקסימום
  expected_demand: FLOAT,          -- ביקוש ממוצע
  confidence_score: FLOAT,         -- ביטחון ממוצע
  total_days: INTEGER,             -- כמות ימים
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

---

## ⚙️ התקנה והפעלה

### 1. Cron Configuration (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/update-predictions",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 2. Environment Variables
```bash
CRON_SECRET=your_secret_here              # חובה
NEXT_PUBLIC_SUPABASE_URL=...              # חובה
SUPABASE_SERVICE_ROLE_KEY=...             # חובה
```

### 3. Deploy to Vercel
```bash
git add -A
git commit -m "feat: auto prediction updates"
git push
```

### 4. בדיקה ידנית
```bash
# Local test
node test-update-predictions.mjs

# Production test (Vercel)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://your-app.vercel.app/api/cron/update-predictions
```

---

## 🖥️ תצוגה ב-UI

### דף תחזיות מחודש:
- **טאב "Live"** - תחזיות חיות 12 חודשים
- **רענון אוטומטי** - כל 5 דקות
- **כרטיסים חודשיים:**
  - מחיר ממוצע
  - טווח (מינימום-מקסימום)
  - ביקוש צפוי
  - רמת ביטחון
  - טרנד (עליה/ירידה)
  - זמן עדכון אחרון

### דוגמה:
```
┌─────────────────────────────────┐
│ 📅 ינואר 2026           החודש  │
├─────────────────────────────────┤
│ מחיר ממוצע: ₪650        ↑      │
│ מינימום: ₪550  מקסימום: ₪750   │
│ ביקוש: 85%    ביטחון: גבוה     │
│ עודכן: 27/12 08:15              │
└─────────────────────────────────┘
```

---

## 📈 סיכום שנתי

המערכת מציגה גם סטטיסטיקות כוללות:
- **מחיר ממוצע שנתי** - ממוצע של כל 12 החודשים
- **מחיר מינימום** - הנמוך ביותר בשנה
- **מחיר מקסימום** - הגבוה ביותר בשנה
- **ביטחון ממוצע** - אחוז ביטחון כולל

---

## 🔍 מעקב ופתרון בעיות

### Logs
```bash
# Vercel logs
vercel logs --follow

# Local dev
npm run dev
# פתח: http://localhost:3000/api/cron/update-predictions
```

### Debug Checklist
- ✅ CRON_SECRET מוגדר ב-Vercel?
- ✅ Supabase credentials תקינים?
- ✅ יש נתוני מתחרים בטבלה `competitor_daily_prices`?
- ✅ ה-Cron רץ בזמן (בדוק Vercel Dashboard > Cron)?
- ✅ טבלאות `price_predictions` ו-`monthly_forecasts` קיימות?

### שגיאות נפוצות

#### ❌ "Unauthorized"
**פתרון:** ודא ש-CRON_SECRET זהה ב-vercel.json וב-environment variables

#### ❌ "לא נמצא מלון"
**פתרון:** ודא שיש רשומה בטבלה `hotels`

#### ❌ "אין נתוני מתחרים"
**פתרון:** הרץ סריקת מתחרים קודם:
```bash
node simple-scan.mjs
```

---

## 🚀 יתרונות המערכת

### 1. אוטומציה מלאה
- ⏰ רץ כל שעה ללא התערבות
- 🔄 מעדכן את עצמו באופן אוטומטי
- 📊 תמיד מעודכן עם הנתונים האחרונים

### 2. דיוק גבוה
- 📈 משתמש ב-30 יום של נתונים אמיתיים
- 🧮 אלגוריתמים מתקדמים (demand + seasonal + competitor)
- 🎯 רמת ביטחון דינמית לכל תחזית

### 3. תצוגה אינטואיטיבית
- 📅 12 חודשים במבט אחד
- 📊 גרפים וטרנדים ברורים
- 🔄 רענון אוטומטי ב-UI

### 4. גמישות
- 🎛️ ניתן לכוונון (seasonality, competitor weight)
- 📏 מחירי min/max להגנה
- 🔧 קל לתחזוקה ושיפורים

---

## 📝 TODO עתידי

- [ ] הוסף weather data להשפעה על ביקוש
- [ ] למד מהיסטוריה (machine learning)
- [ ] התאמה אוטומטית של seasonality
- [ ] התראות על שינויים דרסטיים
- [ ] השוואה עם מחירים בפועל (accuracy tracking)

---

## 📞 תמיכה

שאלות? בעיות? רעיונות?
- 📧 Email: support@hotelpricemonitor.com
- 💬 Slack: #predictions-support
- 📚 Docs: /docs/predictions/

---

**נוצר על ידי:** AI Hotel Price Monitor Team  
**תאריך:** 27 דצמבר 2024  
**גרסה:** 1.0
