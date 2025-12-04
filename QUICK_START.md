# 🚀 התחלה מהירה - Booking.com Scraper

## ✅ מה עשינו עד כה:

1. ✅ **Merged ה-PR** - כל הקוד החדש עכשיו ב-main branch
2. ✅ **יצרנו `.env.local`** - קובץ הגדרות עם template
3. ✅ **npm install** - כל ה-dependencies מותקנים

## 🔧 מה צריך לעשות עכשיו:

### שלב 1: הגדר את Bright Data (חובה לביצועים מיטביים!)

ערוך את הקובץ `.env.local` והחלף את הערכים:

```bash
# פתח את הקובץ
nano .env.local

# או
code .env.local
```

**איך לקבל את הפרטים?**

1. היכנס ל-**[Bright Data Dashboard](https://brightdata.com/cp/dashboard)**
2. לך ל-**Proxies** → **Scraping Browser** (או **Web Unlocker**)
3. העתק את הפרטים הבאים:

```env
BRIGHT_DATA_PROXY_HOST=brd.superproxy.io          # הורד מ-Bright Data
BRIGHT_DATA_PROXY_PORT=22225                       # בדרך כלל 22225 או 33335
BRIGHT_DATA_USERNAME=brd-customer-xxxxx-zone-...   # העתק מ-Bright Data
BRIGHT_DATA_PASSWORD=xxxxxxxxxxxxxxxx               # העתק מ-Bright Data
```

**💡 טיפ:** אם אין לך Bright Data account, המערכת תעבוד גם בלי (אבל עם שיעור הצלחה נמוך יותר)

### שלב 2: בדוק שה-Scraper עובד

```bash
# בדיקה מהירה
node test-puppeteer-scraper.mjs
```

**תוצאה מצופה:**
```
🔧 Testing Puppeteer Scraper
============================================================
✅ Browser launched
✅ Page loaded
📄 Page title: David InterContinental Tel Aviv
💰 Found 5 prices!
🎉 SUCCESS! Scraper is working!
```

### שלב 3: הרץ את ה-Dev Server

```bash
npm run dev
```

והמערכת תהיה זמינה ב-**http://localhost:3000**

## 🧪 איך לבדוק שזה עובד במערכת?

### דרך ה-UI:
1. פתח **http://localhost:3000**
2. לך ל-**Dashboard** או **Scan Management**
3. לחץ על **"Run Full Scan"** או **"Scan Competitors"**
4. המערכת תתחיל לסרוק אוטומטית!

### דרך API:
```bash
curl -X POST http://localhost:3000/api/scraper/run-full \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "your-hotel-id",
    "daysToScan": 7,
    "useRealScraping": true
  }'
```

## 📊 מה תראה ב-Logs?

אם הכל עובד נכון, תראה:

```
[BookingScraper] Starting scrape for Hotel XYZ in Tel Aviv
[BookingScraper] 🚀 Method 1: Advanced Puppeteer with Bright Data proxy...
[AdvancedScraper] Using proxy: brd.superproxy.io:22225
[AdvancedScraper] Navigating to page...
[AdvancedScraper] Page loaded successfully
[AdvancedScraper] Page title: Hotel Name - Booking.com
[AdvancedScraper] Found 12 price candidates
[AdvancedScraper] Extracted 5 valid unique prices
[BookingScraper] ✅ SUCCESS with Advanced Puppeteer+Proxy: ILS 850
```

## 🚨 אם יש בעיות:

### ❌ "Bright Data proxy not configured"
**פתרון:** ודא שערכת את `.env.local` עם הפרטים האמיתיים מ-Bright Data

### ❌ "All 6 methods failed"
**סיבות אפשריות:**
- המלון לא זמין בתאריכים המבוקשים
- בעיית חיבור לאינטרנט
- Bright Data חסום או אין קרדיט

**פתרון:**
1. בדוק את ה-screenshot: `debug-screenshot.png`
2. נסה מלון אחר או תאריכים אחרים
3. בדוק שיש קרדיט ב-Bright Data

### ❌ Puppeteer לא מתחיל
```bash
# התקן מחדש
npm install puppeteer
```

## 📚 מסמכים נוספים

- **`SCRAPER_SETUP.md`** - מדריך מפורט עם כל הפרטים
- **`README.md`** - תיעוד כללי של הפרויקט

## 💡 טיפים לביצועים:

1. **הוסף delays** בין סריקות (2-5 שניות)
2. **סרוק בלילה** (02:00-06:00 AM) - פחות עומס
3. **התחל עם מעט ימים** (7 ימים במקום 60)
4. **שמור cache** - אל תסרוק אותו מלון/תאריך יותר מפעם ביום

## 🎉 זהו! אתה מוכן!

המערכת מוכנה לשימוש. רק צריך:
1. להגדיר את Bright Data ב-`.env.local`
2. להריץ `npm run dev`
3. להתחיל לסרוק מחירים! 🚀

**בהצלחה!** 💪
