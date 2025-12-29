# 🔍 Multi-Agent System - מדריך Debugging

## 🚨 הבעיה שזוהתה

בפרודקשן נראה:
- ✅ Confidence: 73% (לא רע)
- ⚠️ **external data: 50%** - נמוך מדי!

זה אומר שה-Multi-Agent System לא עובד באופן מלא.

---

## 🔍 איך לבדוק מה קורה?

### שלב 1: בדיקת Logs ב-Vercel

1. **היכנס ל-Vercel Dashboard**:
   ```
   https://vercel.com/[your-team]/v0-hotelpricemonitormain3
   ```

2. **לחץ על הטאב "Logs"** או "Runtime Logs"

3. **חפש את הלוגים הבאים**:

   #### ✅ לוגים חיוביים (Multi-Agent עובד):
   ```
   [v0] 🤖 Activating Multi-Agent System...
   [Orchestrator] Environment: TAVILY_API_KEY=✓ Set
   [Orchestrator] Starting Events Agent...
   [Orchestrator] Events Agent completed: 90 dates, 75% confidence
   [v0] 🎉 Multi-Agent System completed:
   [v0]   - Events: 90 dates, confidence 75%
   [v0]   - Historical: 90 dates, confidence 80%
   [v0]   - Overall Confidence: 78%
   ```

   #### ❌ לוגים של בעיות:
   ```
   [Orchestrator] Environment: TAVILY_API_KEY=✗ Missing  ← הבעיה!
   [EventsAgent] TAVILY_API_KEY not set - returning empty results
   [Orchestrator] ⚠️ Events Agent returned no data - check TAVILY_API_KEY
   [v0] ⚠️ Multi-Agent System skipped - external data sources unavailable
   ```

---

## 🔧 תיקון הבעיה

### אם TAVILY_API_KEY חסר:

1. **בדוק ב-Vercel Settings**:
   ```
   Settings → Environment Variables → TAVILY_API_KEY
   ```

2. **ודא שה-Key קיים ופעיל**:
   - לך ל-[tavily.com/dashboard](https://tavily.com/dashboard)
   - בדוק שיש לך credits (1,000 חינם בחודש)
   - העתק את ה-API Key

3. **הוסף/עדכן ב-Vercel**:
   ```
   Variable Name: TAVILY_API_KEY
   Value: tvly-xxxxxxxxxxxxxxxxxxxxxxxx
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

4. **Redeploy**:
   - לחץ על **Deployments** → בחר את ה-deployment האחרון
   - לחץ על ה-3 נקודות → **Redeploy**
   - ✅ Wait ~2 minutes

---

## 📊 איך לדעת שזה עובד?

### 1. בדיקת Logs אחרי Deployment:

חפש:
```
[v0] 🎉 Multi-Agent System completed:
[v0]   - Overall Confidence: 75%+
```

### 2. בדיקת UI:

ב-Confidence Breakdown תראה:
```
external data: 75-95%  ← כששזה עובד!
```

במקום:
```
external data: 50%  ← זה אומר fallback לנתונים ישנים
```

---

## 🧪 בדיקה מקומית

### אם רוצה לבדוק מקומית:

1. **הוסף ל-.env.local**:
   ```bash
   TAVILY_API_KEY=tvly-your-key-here
   ```

2. **הפעל את השרת**:
   ```bash
   npm run dev
   ```

3. **הרץ בדיקה**:
   ```bash
   node test-multi-agent-system.mjs
   ```

4. **צפה בלוגים בטרמינל**:
   ```
   [Orchestrator] Environment: TAVILY_API_KEY=✓ Set
   [Orchestrator] Starting Events Agent...
   [EventsAgent] Searching for events in Tel Aviv...
   ```

---

## 📈 מה צפוי לראות אחרי התיקון?

### Before (עכשיו):
```
Confidence: 73%
├─ booking data: 56%
├─ data quality: 100%
├─ scan recency: 40%
├─ external data: 50%  ← נמוך!
├─ competitor data: 95%
├─ historical data: 90%
└─ market consistency: 66%
```

### After (אחרי התיקון):
```
Confidence: 82%  ← שיפור!
├─ booking data: 56%
├─ data quality: 100%
├─ scan recency: 40%
├─ external data: 85%  ← הרבה יותר טוב!
├─ competitor data: 95%
├─ historical data: 90%
└─ market consistency: 66%
```

---

## 🎯 Checklist

- [ ] TAVILY_API_KEY מוגדר ב-Vercel
- [ ] Environment Variables כוללים את Production
- [ ] Redeploy בוצע
- [ ] Logs מראים "✓ Set" ל-TAVILY_API_KEY
- [ ] Multi-Agent System מדווח על confidence > 70%
- [ ] UI מראה external data > 75%

---

## 💡 Tips נוספים

### 1. מעקב אחרי Credits של Tavily:
- היכנס ל-[tavily.com/dashboard](https://tavily.com/dashboard)
- בדוק כמה searches נשארו לך
- Free tier: 1,000/חודש

### 2. אם ה-Credits נגמרו:
- המערכת תעבור ל-fallback mode אוטומטית
- external data יהיה 30-50% (נתונים ישנים)
- אין שגיאות - זה עובד, רק פחות מדויק

### 3. לוג מפורט של Events:
חפש בלוגים:
```
[v0] 2026-01-15: Events detected, impact=1.3x
[v0] 2026-02-14: Historical trend=increasing
```

---

## 🚀 Next Steps

1. **Deploy עכשיו** (אם עשית שינויים)
2. **בדוק Logs** אחרי 2-3 דקות
3. **רענן את הדף** ב-production
4. **צור חיזויים חדשים** ותראה את השיפור!

---

## 📞 צריך עזרה?

אם עדיין לא עובד:
1. העתק את הלוגים מ-Vercel
2. בדוק שה-API Key תקין ב-Tavily Dashboard
3. נסה לעשות Redeploy נוסף
4. בדוק שאין rate limiting
