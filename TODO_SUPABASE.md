# ✅ מה צריך לעשות ב-Supabase - תשובה קצרה

## 🎯 סיכום

יש לך **3 טבלאות חדשות** למערכת הלמידה האוטומטית שנוצרה היום.  
צריך לבדוק אם הן קיימות ב-Supabase, ואם לא - להריץ SQL.

---

## 📋 הטבלאות שצריכות להיות

### 🧠 מערכת למידה (חדש!):
1. **`prediction_accuracy`** - משווה חיזויים למציאות
2. **`model_performance_summary`** - סיכומי ביצועים
3. **`prediction_generation_logs`** - לוג של רענוני חיזויים

### 📊 נתוני תיירות (אופציונלי):
4. **`cbs_tourism_data`** - סטטיסטיקות ממשרד התיירות (הקובץ שפתחת)

---

## 🔍 איך לבדוק?

### אופציה 1: דרך Supabase Dashboard

1. כניסה ל-Supabase: https://supabase.com/dashboard
2. בחר בפרויקט שלך
3. לך ל-**SQL Editor**
4. הרץ את הקובץ: `check-tables.sql` (הוא יראה לך מה חסר)

### אופציה 2: דרך השרת (אם רץ)

```bash
npm run dev
# בטרמינל אחר:
curl http://localhost:3000/api/learning/check-tables
```

---

## 🚀 אם טבלאות חסרות - הרץ SQL

### בSupabase SQL Editor, העתק והרץ:

#### אם `prediction_accuracy` חסרה:
```sql
-- העתק את כל תוכן הקובץ:
create-feedback-loop-system.sql
```

#### אם `prediction_generation_logs` חסרה:
```sql
-- העתק את כל תוכן הקובץ:
create-prediction-generation-logs.sql
```

#### אם `cbs_tourism_data` חסרה:
```sql
-- העתק את כל תוכן הקובץ:
create-cbs-tourism-table.sql
```

---

## ✅ אחרי זה

המערכת תתחיל לעבוד **אוטומטית**:
- כל יום ב-**2 AM**: רענון חיזויים
- כל יום ב-**3 AM**: בדיקת דיוק

ותוכל לראות בדאשבורד: `http://localhost:3000/learning`

---

## 📁 קבצים שיעזרו לך

- `SUPABASE_CHECK_GUIDE.md` - מדריך מפורט
- `LEARNING_SYSTEM.md` - תיעוד מלא של מערכת הלמידה
- `check-tables.sql` - SQL לבדיקת טבלאות
- `check-supabase.sh` - סקריפט בדיקה

---

**סה"כ**: רק צריך לבדוק אם 3-4 טבלאות קיימות, ואם לא - להריץ 3 קבצי SQL. זהו! 🎉
