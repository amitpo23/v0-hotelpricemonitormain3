# 🔍 בדיקת Supabase - סטטוס וטבלאות חסרות

## סיכום מהיר

נכון ל-**2 בינואר 2026**, המערכת כוללת **מערכת למידה אוטומטית** שנוצרה זה עתה.
יש לבדוק אילו טבלאות קיימות ב-Supabase ואילו חסרות.

---

## 📋 רשימת טבלאות נדרשות

### 🏨 **Core Tables** (טבלאות ליבה)
אלו צריכות להיות קיימות כבר:

- ✅ `hotels` - מלונות
- ✅ `bookings` - הזמנות
- ✅ `price_predictions` - חיזויי מחיר
- ✅ `competitor_prices` - מחירי מתחרים
- ✅ `scan_history` - היסטוריית סריקות

---

### 🧠 **Learning System Tables** (מערכת למידה - חדש!)
אלו נוצרו היום ונדרשות למערכת הלמידה:

#### 1. `prediction_accuracy` ⚠️
**מטרה**: משווה חיזויים למציאות  
**קובץ SQL**: `create-feedback-loop-system.sql` (271 שורות)  
**תיאור**: שומר כל חיזוי מול המחיר/תפוסה בפועל, מחשב accuracy score

```sql
-- Columns:
- prediction_date, prediction_made_at
- predicted_price, actual_price, price_error_percent
- predicted_occupancy, actual_occupancy
- accuracy_score (0-100)
- factors_used JSONB
```

#### 2. `model_performance_summary` ⚠️
**מטרה**: סיכומי ביצועים לאורך זמן  
**קובץ SQL**: `create-feedback-loop-system.sql` (אותו קובץ)  
**תיאור**: אגרגציה של דיוקים לפי תקופות (יומי/שבועי/חודשי)

```sql
-- Columns:
- period_start, period_end, period_type
- avg_accuracy_score
- very_accurate_count, accurate_count, moderate_count, poor_count
- best/worst prediction days
```

#### 3. `prediction_generation_logs` ⚠️
**מטרה**: לוג של כל יצירת חיזויים  
**קובץ SQL**: `create-prediction-generation-logs.sql` (91 שורות)  
**תיאור**: מעקב אחרי כל session של יצירת חיזויים

```sql
-- Columns:
- session_id, status (running/completed/failed)
- predictions_created, predictions_updated
- logs JSONB (detailed progress)
```

---

### 📊 **Analytics Tables** (אנליטיקה)

#### 4. `cbs_tourism_data` ⚠️
**מטרה**: נתוני תיירות ממשרד התיירות  
**קובץ SQL**: `create-cbs-tourism-table.sql` (101 שורות) - **הקובץ שפתחת**  
**תיאור**: נתונים סטטיסטיים על תיירות בישראל

```sql
-- Columns:
- period (YYYY-MM), region
- total_arrivals, tourist_nights
- avg_occupancy_rate, avg_room_price
- yoy_growth metrics
```

**נתונים מוכנים**: כולל data sample מ-2024 ו-2025!

---

### 💾 **Cache & Logs** (אופציונלי)

- `api_cache` - קאש של API calls
- `scan_logs` - לוגים מפורטים של סריקות
- `error_logs` - לוג שגיאות

אלו אופציונליים ויכולים להיות missing.

---

## 🎯 מה צריך לעשות?

### שלב 1: בדוק מה קיים ב-Supabase

הרץ את הבדיקה:
```bash
node check-all-supabase-tables.mjs
```

או השתמש ב-API endpoint (אם השרת רץ):
```bash
curl http://localhost:3000/api/learning/check-tables
```

---

### שלב 2: הרץ SQL Files החסרים

אם טבלאות חסרות, היכנס ל-Supabase SQL Editor:

**🌐 Supabase SQL Editor:**  
`https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql`

**הרץ לפי הסדר:**

#### אם `prediction_accuracy` או `model_performance_summary` חסרות:
```sql
-- העתק והרץ את כל תוכן הקובץ:
create-feedback-loop-system.sql
```

זה ייצור:
- ✅ `prediction_accuracy` table
- ✅ `model_performance_summary` table  
- ✅ Indexes, RLS policies, functions

#### אם `prediction_generation_logs` חסרה:
```sql
-- העתק והרץ:
create-prediction-generation-logs.sql
```

#### אם `cbs_tourism_data` חסרה:
```sql
-- העתק והרץ:
create-cbs-tourism-table.sql
```

**בונוס**: זה כבר כולל 36 שורות של נתוני sample מ-2024-2025! 🎁

---

### שלב 3: ודא שהטבלאות נוצרו

אחרי הרצת ה-SQL, בדוק שוב:
```bash
node check-all-supabase-tables.mjs
```

אמור לראות:
```
✅ prediction_accuracy               0 rows
✅ model_performance_summary         0 rows
✅ prediction_generation_logs        0 rows
✅ cbs_tourism_data                  36 rows  (!)
```

---

## 🔄 איך המערכת תעבוד אחרי זה?

### Cron Job 1: בדיקת דיוק (3 AM)
```
כל יום ב-3:00 AM:
→ /api/learning/accuracy
→ משווה חיזויים של אתמול למחירים בפועל
→ מעדכן prediction_accuracy table
→ מעדכן model_performance_summary
```

### Cron Job 2: רענון חיזויים (2 AM)
```
כל יום ב-2:00 AM:
→ /api/learning/refresh-predictions  
→ מייצר מחדש חיזויים ל-90 ימים קדימה
→ משתמש בלמידה מבדיקת הדיוק
→ שומר ב-prediction_generation_logs
```

### דאשבורד למידה
```
/learning
→ מציג דיוק ממוצע, מגמות, המלצות
→ רשימת חיזויים אחרונים מול מציאות
→ התפלגות דיוקים
```

---

## 📁 קבצי SQL זמינים

בתיקייה הראשית יש:

| קובץ | מה הוא יוצר | שורות |
|------|-------------|-------|
| `create-feedback-loop-system.sql` | prediction_accuracy + model_performance_summary | 271 |
| `create-prediction-generation-logs.sql` | prediction_generation_logs | 91 |
| `create-cbs-tourism-table.sql` | cbs_tourism_data + 36 rows data | 101 |
| `create-scan-logs-now.sql` | scan_logs table | ? |
| `create-enhanced-booking-analytics.sql` | booking analytics | ? |

---

## ⚡ Quick Commands

### בדוק טבלאות:
```bash
node check-all-supabase-tables.mjs
```

### בדוק דיוק ידני (אחרי שהטבלאות קיימות):
```bash
curl -X POST http://localhost:3000/api/learning/accuracy?daysBack=7
```

### רענן חיזויים ידני:
```bash
curl -X POST http://localhost:3000/api/learning/refresh-predictions
```

### ראה דאשבורד למידה:
```
http://localhost:3000/learning
```

---

## ✅ Checklist

- [ ] הרצתי `node check-all-supabase-tables.mjs`
- [ ] הרצתי `create-feedback-loop-system.sql` בSupabase
- [ ] הרצתי `create-prediction-generation-logs.sql` בSupabase
- [ ] הרצתי `create-cbs-tourism-table.sql` בSupabase  
- [ ] בדקתי שוב - כל הטבלאות קיימות
- [ ] Cron jobs יעבדו אוטומטית מ-Vercel (אחרי deploy)
- [ ] דאשבורד `/learning` פועל

---

## 🎯 סיכום

**סטטוס נוכחי**: 
- ✅ קוד מוכן ב-GitHub (commit 6c6ee9d)
- ✅ Cron jobs מוגדרים (vercel.json)
- ⚠️ טבלאות ב-Supabase - **צריך בדיקה והרצה**

**מה חסר**:
1. לבדוק אילו טבלאות קיימות ב-Supabase
2. להריץ SQL files של הטבלאות החסרות
3. לאמת שהכל עובד

**אחרי זה**: מערכת למידה אוטומטית 100% תעבוד! 🚀

---

**נוצר**: 2 בינואר 2026  
**Commit**: 6c6ee9d - Automated Learning System  
**Documentation**: LEARNING_SYSTEM.md
