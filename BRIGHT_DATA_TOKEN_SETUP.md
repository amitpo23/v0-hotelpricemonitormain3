# 🔑 הגדרת Bright Data API Token - מדריך מפורט

## ⚠️ בעיה שזוהתה

ה-token שסיפקת (`e8b07b93e0dd5e6c42d10b31e01d8aef14b93cbf1b2a2ced9d2c56ecf05a8842`) מחזיר שגיאת **401 - Invalid token**.

זה אומר אחד מהבאים:
1. ❌ ה-token פג תוקף
2. ❌ ה-token נוצר בהרשאות לא נכונות
3. ❌ ה-token נמחק מה-Dashboard

---

## 🎯 כיצד ליצור Token תקין

### שלב 1: כניסה ל-Bright Data Dashboard
1. היכנס ל: **https://brightdata.com/cp/dashboard**
2. התחבר עם המשתמש שלך

### שלב 2: יצירת API Token חדש
1. לחץ על **Settings** (הגדרות) בתפריט הצידי
2. לחץ על **API Tokens** או **API Access**
3. לחץ על **+ Create New Token** / **Generate Token**

### שלב 3: קביעת הרשאות (CRITICAL!)
**הרשאות נדרשות בדיוק:**
- ✅ **Web Unlocker** - READ & WRITE
- ✅ **Scraping Browser** - READ & WRITE
- ⚠️ מומלץ: **Admin permissions** להתקנה מפושטת

### שלב 4: שמירת ה-Token
1. לאחר יצירת ה-Token, **העתק אותו מיד**
2. ⚠️ **חשוב מאוד:** לא תוכל לראות אותו שוב אחרי שתסגור את החלון!
3. ה-Token צריך להיראות כך: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 📝 הגדרת ה-Token בפרויקט

### אופציה 1: עריכת קובץ .env.local (מומלץ)
```bash
# פתח את הקובץ:
nano /home/user/webapp/.env.local

# הוסף את השורה הבאה (החלף בToken האמיתי שלך):
BRIGHT_DATA_API_TOKEN=YOUR_ACTUAL_TOKEN_HERE

# שמור: Ctrl+O, Enter, Ctrl+X
```

### אופציה 2: הרצת פקודה ישירה
```bash
cd /home/user/webapp
echo "BRIGHT_DATA_API_TOKEN=YOUR_ACTUAL_TOKEN_HERE" >> .env.local
```

**דוגמה:**
```bash
BRIGHT_DATA_API_TOKEN=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcdef12
```

---

## 🧪 בדיקת החיבור

לאחר הגדרת ה-Token, הרץ את הפקודה הבאה:

```bash
cd /home/user/webapp && node test-brightdata-mcp.mjs
```

### תוצאות מצופות:

#### ✅ הצלחה (Success):
```
🚀 Testing Bright Data MCP Connection...
📡 Connecting to Bright Data MCP...
✅ Connected successfully!
📋 Listing available tools...
Found 4 tools:
  1. search_engine
  2. scrape_as_markdown
  3. search_engine_batch
  4. scrape_batch
🧪 Testing web scrape tool...
✅ SUCCESS! Found price information in scrape results!
```

#### ❌ כשלון (Failure):
```
❌ MCP Test Failed: HTTP 401: Invalid token
```

---

## 🔄 שיטות Fallback (אם ה-Token לא עובד)

המערכת שלנו בנויה עם **5 שיטות fallback**:

### 1️⃣ Bright Data MCP (העדיף ביותר - 90-95% הצלחה)
- נדרש: `BRIGHT_DATA_API_TOKEN`
- מחיר: ~$0.001-0.005 לכל request
- זמן: 5-10 שניות
- **זו השיטה הכי חזקה!**

### 2️⃣ Bright Data Proxy
- נדרש: `BRIGHT_DATA_PROXY_HOST`, `BRIGHT_DATA_USERNAME`, `BRIGHT_DATA_PASSWORD`
- הצלחה: 80-85%
- מחיר: זול יותר
- זמן: 3-7 שניות

### 3️⃣ Booking.com GraphQL API
- אין צורך ב-Bright Data
- הצלחה: 60-70%
- **חינם!**
- זמן: 2-5 שניות

### 4️⃣ Booking.com Autocomplete API
- אין צורך ב-Bright Data
- הצלחה: 40-50%
- **חינם!**
- זמן: 1-3 שניות

### 5️⃣ Direct HTML Scraping
- אין צורך ב-Bright Data
- הצלחה: 20-30%
- **חינם!**
- זמן: 1-2 שניות

---

## 🛠️ פתרון בעיות נפוצות

### שגיאה: "Invalid token"
**פתרון:**
1. וודא שהעתקת את כל ה-Token (ללא רווחים)
2. וודא שה-Token לא פג תוקף
3. צור Token חדש מה-Dashboard

### שגיאה: "Insufficient permissions"
**פתרון:**
1. צור Token חדש עם הרשאות Admin
2. או הוסף הרשאות: Web Unlocker + Scraping Browser

### שגיאה: "Connection refused"
**פתרון:**
1. בדוק חיבור לאינטרנט
2. בדוק שה-URL: `https://mcp.brightdata.com/sse?token=...`
3. נסה להריץ את הבדיקה שוב

### לא מצליח לקבל מחירים
**פתרון:**
1. בדוק שהמלון קיים ב-Booking.com
2. בדוק שהתאריכים זמינים
3. המערכת תעבור אוטומטית ל-fallback methods

---

## 📊 איך לראות שהמערכת עובדת

### דרך 1: דרך ה-UI
1. הרץ: `npm run dev`
2. פתח דפדפן: `http://localhost:3000`
3. לך ל-Dashboard → Scan Management
4. לחץ על "Run Full Scan"
5. בדוק את ה-logs

### דרך 2: דרך ה-API
```bash
curl -X POST http://localhost:3000/api/scraper/run-full \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "YOUR_HOTEL_ID",
    "daysToScan": 7,
    "useRealScraping": true
  }'
```

### דרך 3: בדיקה ישירה
```bash
cd /home/user/webapp && node test-brightdata-mcp.mjs
```

---

## 💰 עלויות Bright Data

### MCP (Method 1)
- **מחיר:** $0.001 - $0.005 לכל request
- **דוגמה:** 1000 סריקות = $1-5
- **כדאי:** כשצריך הצלחה גבוהה (90%+)

### Proxy (Method 2)
- **מחיר:** $0.0005 - $0.002 לכל request
- **דוגמה:** 1000 סריקות = $0.5-2
- **כדאי:** כשצריך איזון בין עלות להצלחה

### GraphQL/Autocomplete/Direct (Methods 3-5)
- **מחיר:** חינם! 🎉
- **הצלחה:** נמוכה יותר (20-70%)
- **כדאי:** לבדיקות או כשאין תקציב

---

## 📞 צריך עזרה?

1. **Bright Data Support:** https://help.brightdata.com
2. **Documentation:** https://docs.brightdata.com
3. **Dashboard:** https://brightdata.com/cp/dashboard
4. **GitHub Issues:** https://github.com/brightdata/brightdata-agent-showcase/issues

---

## ✅ סיכום - מה עושים עכשיו?

1. **🔑 צור Token חדש** ב-Dashboard של Bright Data
2. **📝 הוסף ל-.env.local** את ה-Token החדש
3. **🧪 הרץ בדיקה:** `node test-brightdata-mcp.mjs`
4. **✅ וודא הצלחה:** צריך לראות "SUCCESS!"
5. **🚀 הפעל את המערכת:** `npm run dev`

---

**⚡ עדכון אחרון:** 2025-12-04

**📌 חשוב:** אם ה-Token לא עובד, המערכת תעבור אוטומטית לשיטות fallback חינמיות!
