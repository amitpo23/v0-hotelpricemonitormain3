# 🚀 התקנת מערכת הלוגים המפורטים

## מה נבנה?

מערכת לוגים מפורטת שמתעדת את כל תהליך קבלת ההחלטות בחיזוי מחירים:
- ✅ **טבלה חדשה** ב-Supabase: `prediction_logs`
- ✅ **API endpoint** לקריאת לוגים: `/api/predictions/logs`
- ✅ **קומפוננטה UI** להצגת לוגים בדף predictions
- ✅ **לחצן "Logs"** על כל חיזוי בטבלה
- ✅ **מחירים בשקלים** (₪) ולא בדולרים

---

## שלב 1: יצירת טבלת prediction_logs ב-Supabase

### אופציה א' - דרך Dashboard (מומלץ):

1. **היכנס ל-Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/editor
   ```

2. **לחץ על "SQL Editor"** בתפריט הצד

3. **העתק והדבק** את התוכן של הקובץ:
   ```
   create-prediction-logs-table.sql
   ```

4. **לחץ "Run"** להרצת הסקריפט

5. **וודא שהטבלה נוצרה**:
   - לך ל-"Table Editor"
   - חפש טבלה בשם `prediction_logs`
   - וודא שיש 11 עמודות

### אופציה ב' - דרך Supabase CLI:

```bash
# התקן Supabase CLI (אם עדיין לא מותקן)
npm install -g supabase

# התחבר לפרויקט
supabase login

# קישור לפרויקט
supabase link --project-ref [YOUR_PROJECT_ID]

# הרץ migration
supabase db push
```

---

## שלב 2: בדיקת התקנה

### בדוק שהקוד מקומפל ללא שגיאות:

```bash
npm run build
```

**שגיאות אפשריות**:
- ❌ `Cannot find module '@/components/ui/dialog'`
  - **פתרון**: וודא ש-shadcn/ui מותקן:
    ```bash
    npx shadcn-ui@latest add dialog
    npx shadcn-ui@latest add tabs
    npx shadcn-ui@latest add badge
    ```

- ❌ `Cannot find name 'debugMode'`
  - **פתרון**: השגיאה כבר תוקנה בקוד האחרון

---

## שלב 3: הרצת חיזויים עם לוגים

### א. ייצור חיזויים רגיל (ללא לוגים):

```bash
curl -X POST http://localhost:3000/api/predictions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "selectedYear": 2026,
    "selectedMonths": [2],
    "daysAhead": 30
  }'
```

**זה ישמור לוגים עבור 5 התאריכים הראשונים בלבד.**

### ב. ייצור חיזויים עם debug mode (כל הלוגים):

```bash
curl -X POST "http://localhost:3000/api/predictions/generate?debug=true" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedYear": 2026,
    "selectedMonths": [2],
    "daysAhead": 30
  }'
```

**זה ישמור לוגים מפורטים עבור כל התאריכים.**

---

## שלב 4: צפייה בלוגים

### א. דרך ה-UI:

1. **פתח את דף ה-predictions**:
   ```
   http://localhost:3000/predictions
   ```

2. **לחץ על כפתור "Logs"** ליד כל חיזוי

3. **צפה ב-6 טאבים**:
   - **סקירה**: תקציר כללי
   - **Multi-Agent**: נתונים מ-3 agents
   - **פקטורים**: 8 פקטורים מפורטים
   - **מחיר**: חישוב מחיר שלב אחר שלב
   - **Confidence**: פירוק confidence score
   - **תוצאה**: תוצאה סופית + המלצות

### ב. דרך API:

```bash
# קבל את הלוג האחרון
curl "http://localhost:3000/api/predictions/logs?hotelId=HOTEL_ID&predictionDate=2026-02-15&latest=true"

# קבל את כל הלוגים
curl "http://localhost:3000/api/predictions/logs?hotelId=HOTEL_ID&predictionDate=2026-02-15&limit=10"
```

### ג. דרך Supabase Dashboard:

1. לך ל-**Table Editor** → `prediction_logs`
2. סנן לפי `hotel_id` או `prediction_date`
3. לחץ על שורה לראות את כל ה-JSONB data

---

## שלב 5: אימות המחירים בשקלים

### בדוק שהמחירים מוצגים נכון:

1. **בדף predictions**:
   - וודא שהמחירים מתחילים ב-`₪` (שקל)
   - לא `$` (דולר)

2. **בלוגים**:
   - כל המחירים צריכים להיות עם סמל `₪`
   - בדוק בטאב "מחיר" ו"תוצאה"

3. **בקוד**:
   - חפש בקובץ `predictions-client.tsx`:
     ```tsx
     ₪{pred.predicted_price?.toFixed(0) || "N/A"}
     ```
   - חפש בקובץ `prediction-log-viewer.tsx`:
     ```tsx
     ₪{log.result?.predictedPrice?.toLocaleString()}
     ```

---

## שלב 6: בדיקת נתונים

### בדוק שהלוגים נשמרים בצורה נכונה:

```sql
-- בדוק כמה לוגים נשמרו
SELECT COUNT(*) FROM prediction_logs;

-- בדוק לוג אחרון
SELECT 
  hotel_name,
  prediction_date,
  (result->>'predictedPrice')::numeric as price,
  (result->>'confidence')::numeric as confidence,
  created_at
FROM prediction_logs
ORDER BY created_at DESC
LIMIT 10;

-- בדוק Multi-Agent data
SELECT 
  hotel_name,
  prediction_date,
  multi_agent_data->'eventsFound' as events,
  multi_agent_data->'overallConfidence' as confidence,
  multi_agent_data->'dataQuality' as quality
FROM prediction_logs
WHERE multi_agent_data IS NOT NULL
LIMIT 10;

-- בדוק פקטורים
SELECT 
  hotel_name,
  prediction_date,
  factors->'seasonality'->>'value' as seasonality,
  factors->'occupancy'->>'rate' as occupancy_rate,
  factors->'events'->>'eventsList' as events
FROM prediction_logs
WHERE factors IS NOT NULL
LIMIT 10;
```

---

## טיפים לפתרון בעיות

### בעיה 1: הטבלה לא נוצרה
```bash
# בדוק שהטבלה קיימת
echo "SELECT tablename FROM pg_tables WHERE tablename = 'prediction_logs';" | psql $DATABASE_URL
```

### בעיה 2: אין לוגים נשמרים
```typescript
// הוסף לוגים בקוד:
console.log('[DEBUG] Saving prediction log:', {
  hotelId,
  predictionDate,
  hasMultiAgent: !!multiAgentData
})
```

### בעיה 3: שגיאת הרשאות
```sql
-- וודא ש-RLS מוגדר נכון
SELECT * FROM pg_policies WHERE tablename = 'prediction_logs';
```

### בעיה 4: UI לא מציג לוגים
```bash
# בדוק שה-API עובד
curl "http://localhost:3000/api/predictions/logs?hotelId=HOTEL_ID&predictionDate=2026-02-01&latest=true" | jq
```

---

## מה הלאה?

### 1. שפר את הלוגים:
- הוסף עוד פקטורים
- הוסף גרפים ויזואליים
- הוסף השוואה בין לוגים

### 2. אנליזה:
- יצא דו"חות של החלטות
- מצא פטרנים בחיזויים
- שפר את האלגוריתם

### 3. אינטגרציה:
- שלח לוגים ל-Analytics
- הוסף alerts על החלטות חריגות
- בנה dashboard של insights

---

## קבצים שנוצרו

```
✅ create-prediction-logs-table.sql          # SQL ליצירת הטבלה
✅ lib/logging/prediction-logger-db.ts       # שירות לשמירה/קריאה
✅ app/api/predictions/logs/route.ts         # API endpoint
✅ components/prediction-log-viewer.tsx      # UI להצגת לוגים
✅ app/predictions/predictions-client.tsx    # עדכון עם לחצן Logs
✅ PREDICTION_LOGS_SETUP.md                  # המדריך הזה
```

---

## סיכום

🎉 **מערכת הלוגים מוכנה!**

עכשיו אתה יכול:
- ✅ לראות בדיוק איך כל חיזוי חושב
- ✅ להבין את כל השיקולים והמשקלות
- ✅ לדבג בעיות בחיזויים
- ✅ לשפר את האלגוריתם בצורה מושכלת

**לשאלות או בעיות**: ראה את הקובץ `PREDICTION_SYSTEM_GUIDE.md`
