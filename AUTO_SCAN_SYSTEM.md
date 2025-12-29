# 🔄 Auto-Scan & Monitoring System

## 📋 מה השתנה?

המערכת עודכנה עם **checkpoint-based scanning** ו-**auto-restart**:

### ✅ שיפורים:

1. **Smart Checkpoint System**
   - 💾 שומר התקדמות אחרי כל תאריך
   - 🔄 ממשיך מאיפה שעצר (לא מתחיל מחדש)
   - ✅ מסנן תאריכים שכבר הושלמו
   - 🔁 מנסה מחדש תאריכים שנכשלו

2. **Auto-Restart Mechanism**
   - 🕐 בודק כל שעה אם הסריקה תקועה
   - 🚨 אם לא היה עדכון 3+ שעות → מפעיל מחדש
   - 📊 מדווח על התקדמות בזמן אמת

3. **Batch Processing**
   - 📦 סורק 10 תאריכים בכל הפעלת Cron
   - ⏱️ מונע timeout (מקסימום ~5 דקות לבאצ'
   - 🔁 ממשיך באצ'ים הבאים עד סיום

---

## 🚀 איך זה עובד?

### 1. Auto-Scan Cron (כל 72 שעות)

**Endpoint:** `/api/cron/auto-scan`  
**לוח זמנים:** `0 */72 * * *` (כל 72 שעות)

**מה הוא עושה:**
1. קורא `.missing-dates-checkpoint.json`
2. מסנן תאריכים שעוד לא הושלמו
3. סורק באצ' של 10 תאריכים
4. שומר checkpoint אחרי כל תאריך
5. מחזיר דוח התקדמות

**דוגמת תשובה:**
```json
{
  "success": true,
  "message": "Batch completed. 27 dates remaining (69% done).",
  "results": {
    "batch_size": 10,
    "successful": 10,
    "failed": 0,
    "remaining": 27,
    "total_completed": 37,
    "total_missing": 54,
    "progress": 69
  }
}
```

### 2. Monitor Scan Cron (כל שעה)

**Endpoint:** `/api/cron/monitor-scan`  
**לוח זמנים:** `0 * * * *` (כל שעה)

**מה הוא עושה:**
1. בודק אם `.missing-dates-checkpoint.json` קיים
2. מחשב התקדמות (X/54)
3. בודק מתי היה העדכון האחרון
4. **אם 3+ שעות ללא עדכון** → מפעיל `/api/cron/auto-scan`

**תרחישים:**

| מצב | פעולה |
|-----|-------|
| כל התאריכים הושלמו | מדווח "completed" |
| עדכון לפני < 3 שעות | מדווח "monitoring" |
| עדכון לפני > 3 שעות | **מפעיל מחדש** |
| אין checkpoint | מדווח "none" |

---

## 🛠️ שימוש

### בדיקה ידנית (local)

```bash
# הרץ את dev server
npm run dev

# בדוק את Monitor
node test-cron-endpoints.mjs

# או עם curl:
curl -X POST http://localhost:3000/api/cron/monitor-scan \
  -H "Authorization: Bearer your-cron-secret"
```

### הרצה ידנית (production)

```bash
# הפעל את Auto-Scan
curl -X POST https://your-app.vercel.app/api/cron/auto-scan \
  -H "Authorization: Bearer your-cron-secret"

# בדוק מצב
curl -X POST https://your-app.vercel.app/api/cron/monitor-scan \
  -H "Authorization: Bearer your-cron-secret"
```

### הגדרת CRON_SECRET

הוסף ל-`.env.local` ול-Vercel Environment Variables:

```bash
CRON_SECRET=your-secure-random-string-here
```

💡 **טיפ:** צור secret אקראי:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 מעקב אחרי התקדמות

### אופציה 1: בדיקת Checkpoint

```bash
node check-scan-status.mjs
```

**פלט:**
```
📊 סטטוס הסריקה של Q1 2026:
================================

✅ תאריכים שהושלמו: 37/54
📦 מחירים נאספו: 999
✓  הצלחות: 37
✗  כשלונות: 0
📅 אחרון שהושלם: 2026-02-15
🕐 עדכון אחרון: 27/12/2025 02:15:30

📈 התקדמות: 69%
⏳ נותרו: 17 תאריכים
```

### אופציה 2: Vercel Logs

```bash
vercel logs --follow
```

חפש שורות:
- `🕐 Auto-scan cron job triggered`
- `🔍 Scan monitor cron job triggered`
- `✅ Auto-scan batch completed`

### אופציה 3: Database Logs

```sql
SELECT * FROM scan_logs 
WHERE scan_type = 'auto_cron_checkpoint'
ORDER BY triggered_at DESC 
LIMIT 10;
```

---

## 🔧 התאמה אישית

### שינוי גודל באצ'

ערוך `app/api/cron/auto-scan/route.ts`:

```typescript
// Line 94
const batchSize = 10;  // שנה ל-5 לאיטי יותר, 20 למהיר יותר
```

### שינוי timeout של Monitor

ערוך `app/api/cron/monitor-scan/route.ts`:

```typescript
// Line 74
if (hoursSinceUpdate > 3) {  // שנה ל-2 או 6 שעות
```

### שינוי תדירות Cron

ערוך `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-scan",
      "schedule": "0 */48 * * *"  // כל 48 שעות במקום 72
    },
    {
      "path": "/api/cron/monitor-scan",
      "schedule": "0 */2 * * *"  // כל שעתיים במקום שעה
    }
  ]
}
```

---

## ⚠️ פתרון בעיות

### בעיה: Cron לא מופעל

**פתרון:**
1. ודא ש-`CRON_SECRET` מוגדר ב-Vercel
2. בדוק Vercel Cron Logs
3. ודא deployment מעודכן

### בעיה: Checkpoint לא מתעדכן

**פתרון:**
1. בדוק שיש גישת כתיבה ל-filesystem
2. ב-Vercel, השתמש ב-database במקום files
3. הרץ ידנית: `node scan-missing-dates.mjs`

### בעיה: Timeout

**פתרון:**
1. הקטן את `batchSize` ל-5
2. הגדל delay בין requests
3. השתמש ב-Railway במקום Vercel (יותר זמן)

---

## 📈 ביצועים

| מדד | ערך |
|-----|-----|
| זמן לבאצ' (10 תאריכים) | ~3-5 דקות |
| זמן לסריקה מלאה (54) | ~6-8 הפעלות Cron |
| זמן כולל | ~2-3 ימים (עם 72h Cron) |
| עם Monitor | ~12-24 שעות (עם auto-restart) |

---

## 🎉 סיכום

✅ **מה קיבלת:**
1. סריקה אוטומטית עם checkpoint
2. המשך מנקודת העצירה
3. auto-restart אם תקוע
4. ניטור כל שעה
5. דיווחי התקדמות

✅ **איך להפעיל:**
1. העלה ל-Vercel
2. הגדר `CRON_SECRET`
3. Cron יתחיל לעבוד אוטומטית

✅ **איך לעקוב:**
- `node check-scan-status.mjs`
- Vercel Logs
- Database `scan_logs` table

---

**נוצר:** 27 דצמבר 2025  
**גרסה:** 2.0 - Smart Checkpoint System  
**סטטוס:** ✅ Production Ready
