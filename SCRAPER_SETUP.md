# 🚀 Booking.com Scraper - מדריך הגדרה ושימוש

## 📋 סקירה כללית

המערכת כוללת 3 שכבות scraping חזקות שעובדות באופן אוטומטי:

### ✅ שיטות Scraping (לפי סדר עדיפות)

1. **🥇 Advanced Puppeteer + Bright Data Proxy** (המומלץ ביותר)
   - טכנולוגיה מתקדמת לעקיפת bot detection
   - עובד דרך Bright Data proxy
   - שיעור הצלחה גבוה מאוד

2. **🥈 Advanced Puppeteer (ללא Proxy)**
   - גיבוי אם ה-proxy לא זמין
   - טכנולוגיית anti-bot מתקדמת

3. **🥉 Standard Puppeteer + Bright Data Proxy**
   - Puppeteer רגיל עם proxy
   - חלופה נוספת

4. **Standard Puppeteer (ללא Proxy)**
   - גיבוי נוסף

5. **Bright Data API (Legacy)**
   - שיטה ישנה דרך fetch

6. **Direct Fetch (Fallback)**
   - ניסיון אחרון ישיר

## ⚙️ הגדרת Bright Data Proxy

### שלב 1: קבל את פרטי ה-Proxy מ-Bright Data

1. היכנס ל-[Bright Data Dashboard](https://brightdata.com/cp/dashboard)
2. לך ל-Proxies → Web Unlocker או Scraping Browser
3. העתק את הפרטים הבאים:
   - Proxy Host (לדוגמה: `brd.superproxy.io`)
   - Proxy Port (לדוגמה: `22225` או `33335`)
   - Username (לדוגמה: `brd-customer-xxxxx-zone-scraping_browser`)
   - Password

### שלב 2: הגדר משתני סביבה

צור קובץ `.env.local` בשורש הפרויקט:

```env
# Bright Data Proxy Configuration
BRIGHT_DATA_PROXY_HOST=brd.superproxy.io
BRIGHT_DATA_PROXY_PORT=22225
BRIGHT_DATA_USERNAME=your-username-here
BRIGHT_DATA_PASSWORD=your-password-here
```

**⚠️ חשוב:** אל תשתף את קובץ ה-`.env.local` או תעלה אותו ל-Git!

### שלב 3: הרצת המערכת

```bash
# התקן dependencies (אם עוד לא)
npm install

# הרץ dev server
npm run dev
```

## 🧪 בדיקת ה-Scraper

### בדיקה מהירה עם script בודק:

```bash
node test-puppeteer-scraper.mjs
```

### בדיקה דרך ה-API:

```bash
# בדיקת scraping למלון ספציפי
curl -X POST http://localhost:3000/api/scraper/run-full \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "your-hotel-id",
    "daysToScan": 7,
    "useRealScraping": true
  }'
```

## 📊 מבנה הקבצים

```
lib/scraper/
├── booking-scraper.tsx           # מנהל ראשי - מנסה את כל השיטות
├── puppeteer-scraper.ts          # Puppeteer בסיסי עם proxy
├── advanced-puppeteer-scraper.ts # Puppeteer מתקדם עם anti-bot
└── real-scraper.ts               # Wrapper ל-API routes

app/api/scraper/
└── run-full/route.ts            # API endpoint לסריקה מלאה

test-puppeteer-scraper.mjs       # סקריפט בדיקה
```

## 🔍 איך זה עובד?

### תהליך Scraping:

1. **המערכת מקבלת בקשה** לסרוק מחירי מתחרים
2. **מנסה שיטה 1**: Advanced Puppeteer + Proxy
   - אם מצליח → מחזיר מחירים ✅
   - אם נכשל → עובר לשיטה הבאה
3. **מנסה שיטה 2**: Advanced Puppeteer ללא Proxy
4. **וכך הלאה...** עד שמצליח או נכשל בכל השיטות

### Anti-Bot Techniques:

המערכת המתקדמת משתמשת ב:
- ✅ הסתרת `navigator.webdriver`
- ✅ Mock של Chrome runtime
- ✅ Headers אמיתיים
- ✅ User agent אמיתי
- ✅ Viewport ריאליסטי
- ✅ 3 אסטרטגיות extraction שונות

## 📈 מעקב אחר ביצועים

### Logs במסוף:

```
[BookingScraper] Starting scrape for Hotel ABC in Tel Aviv
[BookingScraper] 🚀 Method 1: Advanced Puppeteer with Bright Data proxy...
[AdvancedScraper] Using proxy: brd.superproxy.io:22225
[AdvancedScraper] Page title: David InterContinental Tel Aviv
[AdvancedScraper] Found 15 price candidates
[AdvancedScraper] Extracted 5 valid unique prices
[BookingScraper] ✅ SUCCESS with Advanced Puppeteer+Proxy: ILS 850
```

### Screenshots לדיבוג:

המערכת שומרת screenshot ב-`/home/user/webapp/debug-screenshot.png` לכל ניסיון

## 🛠️ פתרון בעיות

### ❌ "Bright Data proxy not configured"

**פתרון:** ודא שהמשתנים בקובץ `.env.local`:
```bash
BRIGHT_DATA_PROXY_HOST=brd.superproxy.io
BRIGHT_DATA_PROXY_PORT=22225
BRIGHT_DATA_USERNAME=your-username
BRIGHT_DATA_PASSWORD=your-password
```

### ❌ "All 6 methods failed"

**סיבות אפשריות:**
1. המלון לא זמין בתאריכים המבוקשים
2. Booking.com שינה את מבנה העמוד
3. בעיית רשת/חיבור

**פתרון:**
- בדוק את ה-screenshot: `debug-screenshot.png`
- נסה תאריכים אחרים
- בדוק את ה-logs למידע נוסף

### ❌ "CAPTCHA or bot detection triggered"

**פתרון:**
1. ודא ש-Bright Data proxy מוגדר נכון
2. בדוק שיש לך קרדיט ב-Bright Data
3. נסה להוסיף delay בין בקשות

### ❌ Puppeteer לא מתחיל

**פתרון:**
```bash
# התקן מחדש את Puppeteer
npm uninstall puppeteer
npm install puppeteer

# או עם כל ה-dependencies
npm ci
```

## 💡 טיפים לשיפור ביצועים

### 1. הוסף Delays בין סריקות

```typescript
// בקובץ route.ts
await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 שניות delay
```

### 2. סרוק בשעות פחות עמוסות

- **מומלץ:** 02:00-06:00 AM
- **להימנע:** 08:00-22:00 (peak hours)

### 3. הגבל מספר ימים

במקום לסרוק 60 ימים, התחל ב-7-14 ימים:

```json
{
  "daysToScan": 7,
  "startDayOffset": 0
}
```

### 4. שמור קאש של תוצאות

אל תסרוק אותו מלון/תאריך יותר מפעם ביום

## 🔐 אבטחה

### ⚠️ אל תשתף:
- ❌ פרטי Bright Data (username/password)
- ❌ קובץ `.env.local`
- ❌ Screenshots שעשויים להכיל מידע רגיש

### ✅ עשה:
- ✅ השתמש ב-`.gitignore` לקבצי env
- ✅ החלף סיסמאות באופן קבוע
- ✅ הגבל גישה ל-API endpoints

## 📞 תמיכה

אם יש בעיות או שאלות:

1. בדוק את ה-Logs במסוף
2. הסתכל על ה-screenshot: `debug-screenshot.png`
3. בדוק שה-Bright Data proxy פעיל
4. ודא שיש קרדיט ב-Bright Data account

## 🎉 הצלחה!

אם הכל מוגדר נכון, אתה אמור לראות:

```
[BookingScraper] ✅ SUCCESS with Advanced Puppeteer+Proxy: ILS 850
```

והמערכת תתחיל לאסוף מחירים ממתחרים אוטומטית! 🚀
