# 🚀 Vercel Deployment - מערכת למידה אוטומטית

## ✅ מה כבר מוכן ל-Vercel

הכל מוגדר ומוכן לעבודה בפרודקשן:

### 1. **Cron Jobs מוגדרים** (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/learning/accuracy",
      "schedule": "0 3 * * *",
      "description": "בדיקת דיוק - כל יום ב-3 בבוקר"
    },
    {
      "path": "/api/learning/refresh-predictions",
      "schedule": "0 2 * * *",
      "description": "רענון חיזויים - כל יום ב-2 בבוקר"
    }
  ]
}
```

### 2. **Authentication מוגדר**
כל ה-Cron endpoints מאומתים עם `CRON_SECRET`:
- ✅ `/api/learning/accuracy` - מוגן
- ✅ `/api/learning/refresh-predictions` - מוגן
- ✅ פיתוח: עובד בלי authentication (עם warning)
- ✅ פרודקשן: דורש authentication חובה

### 3. **Serverless Configuration**
```typescript
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 דקות
```

### 4. **Supabase Connection**
משתמש ב-`createClient()` שעובד הן ב-localhost והן ב-Vercel

---

## 🔧 הגדרות נדרשות ב-Vercel

### שלב 1: Environment Variables

היכנס ל-**Vercel Dashboard** → Project Settings → Environment Variables

הוסף את המשתנים הבאים:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` | Production, Preview, Development |
| `CRON_SECRET` | `your-secret-key-here` | Production, Preview, Development |

**איפה למצוא את הערכים:**
- Supabase URL/Keys: Supabase Dashboard → Project Settings → API
- CRON_SECRET: צור string אקראי חזק (או השתמש ב-existing)

### שלב 2: Enable Cron Jobs (Vercel Pro+)

**⚠️ חשוב**: Vercel Cron זמין רק ב-**Pro plan** ומעלה

אם יש לך Hobby plan:
1. שדרג ל-Pro
2. או השתמש ב-external cron service (כמו cron-job.org)

**לאימות Cron Jobs בVercel:**
```bash
# Vercel CLI:
vercel env pull
vercel deploy --prod
```

אחרי deploy, בדוק ב-**Vercel Dashboard** → Project → Cron Jobs

תראה:
```
✅ /api/learning/accuracy - Scheduled: 0 3 * * *
✅ /api/learning/refresh-predictions - Scheduled: 0 2 * * *
```

---

## 🧪 בדיקות לפני Production

### 1. **בדוק Cron Authentication**

```bash
# ללא authentication (אמור להיכשל בפרודקשן):
curl -X POST https://your-app.vercel.app/api/learning/accuracy

# עם authentication (אמור לעבוד):
curl -X POST https://your-app.vercel.app/api/learning/accuracy \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. **בדוק טבלאות Supabase**

```bash
curl https://your-app.vercel.app/api/learning/check-tables
```

אמור להחזיר:
```json
{
  "success": true,
  "tables": {
    "prediction_accuracy": { "exists": true },
    "model_performance_summary": { "exists": true },
    "prediction_generation_logs": { "exists": true }
  }
}
```

### 3. **הרץ בדיקת דיוק ידנית**

```bash
curl -X POST https://your-app.vercel.app/api/learning/accuracy?daysBack=7 \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 ניטור ב-Vercel

### 1. **Cron Job Logs**

Vercel Dashboard → Project → Logs → Filter by function:
- `/api/learning/accuracy`
- `/api/learning/refresh-predictions`

תראה:
```
[2026-01-02 03:00:00] ✅ Checked 42 predictions, updated 38
[2026-01-02 03:00:00] ℹ️ Avg accuracy: 87.3%
```

### 2. **Function Duration**

Vercel Dashboard → Analytics → Functions

בדוק:
- Execution time (אמור להיות <5 דקות)
- Success rate (אמור להיות >95%)
- Errors (אמור להיות אפס)

### 3. **Real-time Monitoring**

```bash
# Vercel CLI:
vercel logs --follow
```

---

## 🚨 Troubleshooting

### בעיה: Cron Job לא רץ

**פתרונות:**
1. בדוק שיש Pro plan
2. ודא ש-`vercel.json` נמצא בroot של הפרויקט
3. Redeploy: `vercel --prod`

### בעיה: 401 Unauthorized

**פתרונות:**
1. בדוק ש-`CRON_SECRET` מוגדר בVercel
2. ודא שהוא זהה בקוד וב-env vars
3. בדיקה: `console.log(process.env.CRON_SECRET)` בלוג

### בעיה: Timeout (>10 seconds)

**פתרונות:**
1. הגדלת `maxDuration` ל-300 (כבר עשוי)
2. הפרד לחלקים קטנים יותר
3. השתמש ב-Background Jobs (Vercel Pro feature)

### בעיה: Database connection failed

**פתרונות:**
1. בדוק Supabase connection pooling
2. ודא שאין IP restrictions ב-Supabase
3. בדוק RLS policies (אמורות להיות מוגדרות)

---

## 🔄 Deployment Workflow

### דפלוי ראשון:

```bash
# 1. ודא שכל הקוד committed
git add -A
git commit -m "Ready for production"
git push origin main

# 2. Deploy לVercel
vercel --prod

# 3. הגדר environment variables (פעם אחת)
# עשה זאת דרך Vercel Dashboard

# 4. Redeploy כדי להחיל את ה-env vars
vercel --prod
```

### עדכונים עתידיים:

```bash
# Vercel מחובר ל-GitHub - כל push ל-main יעשה deploy אוטומטי
git push origin main

# או ידנית:
vercel --prod
```

---

## 📅 לוח זמנים - מה יקרה בפרודקשן?

### **כל יום ב-2:00 AM** (UTC):
```
→ Vercel Cron מפעיל: /api/learning/refresh-predictions
→ API מתחבר ל-Supabase
→ מייצר חיזויים ל-90 ימים קדימה
→ שומר ב-prediction_generation_logs
→ זמן ריצה: ~30-60 שניות
→ לוג: "✅ Generated 270 predictions for 3 hotels"
```

### **כל יום ב-3:00 AM** (UTC):
```
→ Vercel Cron מפעיל: /api/learning/accuracy
→ API משווה חיזויים למחירים בפועל
→ מחשב accuracy scores
→ מעדכן prediction_accuracy + model_performance_summary
→ מזהה דפוסי שגיאות
→ מייצר המלצות
→ זמן ריצה: ~20-40 שניות
→ לוג: "✅ Checked 42 predictions, avg accuracy: 87.3%"
```

---

## ✅ Checklist Production-Ready

- [x] **Code**: כל הקוד committed ו-pushed
- [x] **Cron Jobs**: מוגדרים ב-vercel.json
- [x] **Authentication**: CRON_SECRET מוגדר בendpoints
- [x] **Supabase**: 3 טבלאות קיימות
- [x] **Error Handling**: try-catch בכל endpoint
- [x] **Logging**: console.log לכל שלב
- [x] **Timeouts**: maxDuration = 300
- [ ] **Environment Variables**: הוגדרו בVercel Dashboard
- [ ] **First Deploy**: vercel --prod הורץ
- [ ] **Cron Verification**: Cron jobs נראים בדאשבורד
- [ ] **Test Run**: הרצה ידנית עברה בהצלחה

---

## 🎯 Expected Behavior בפרודקשן

### **Week 1:**
- ✅ Cron jobs רצים מדי לילה
- ✅ Logs נראים בVercel Dashboard
- ℹ️ אין עדיין נתוני accuracy (חיזויים צריכים להגיע לתאריך)

### **Week 2-4:**
- ✅ נתוני accuracy מתחילים להצטבר
- ✅ דאשבורד `/learning` מראה נתונים ראשונים
- ✅ המלצות מתחילות להופיע

### **Month 2+:**
- ✅ מערכת למידה בוגרת
- ✅ דיוק גבוה (85%+)
- ✅ שיפור מתמיד אוטומטי

---

## 📞 Support

**בעיות בפרודקשן?**

1. בדוק Vercel Logs
2. בדוק Supabase Logs
3. הרץ: `curl https://your-app.vercel.app/api/learning/check-tables`
4. קרא: `LEARNING_SYSTEM.md` לפרטים טכניים

**Vercel Cron Documentation:**
https://vercel.com/docs/cron-jobs

**Supabase Connection Pooling:**
https://supabase.com/docs/guides/database/connecting-to-postgres

---

**סטטוס**: ✅ מוכן ל-Vercel Production
**Cron Jobs**: ✅ מוגדרים ומוגנים
**Authentication**: ✅ CRON_SECRET נדרש בפרודקשן
**Next Step**: הגדר environment variables בVercel Dashboard ו-deploy!
