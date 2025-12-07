# Booking.com Scraper Setup Guide

## ⚠️ חשוב: מגבלות Vercel

**Puppeteer ו-Bright Data לא יכולים לעבוד ב-Vercel Serverless Functions!**

סיבות:
- ❌ אין Chrome/Chromium זמין ב-Vercel
- ❌ מגבלת גודל של 50MB ל-Serverless Functions
- ❌ לא ניתן להריץ browser processes
- ❌ מגבלת זמן ריצה: 10 שניות (Hobby) / 60 שניות (Pro)

**הפתרון**: השתמש רק ב-**Tavily Search API** - זה עובד מעולה ב-Vercel!

---

## הגדרת Tavily API (מומלץ)

### 1. קבל API Key מ-Tavily

1. היכנס ל-[Tavily.com](https://tavily.com)
2. הירשם או התחבר
3. לך ל-**API Keys**
4. העתק את ה-API Key שלך

### 2. הגדר ב-Vercel

1. לך ל-[Vercel Dashboard](https://vercel.com)
2. **Project Settings** → **Environment Variables**
3. הוסף:
   ```
   TAVILY_API_KEY=tvly-xxxxxxxxxx
   ```
4. **Redeploy** את הפרויקט

---

## (לא רלוונטי ל-Vercel) Bright Data Setup

**שים לב**: חלק זה רלוונטי רק אם אתה מריץ את הפרויקט על שרת משלך (לא Vercel).

### הבעיה שתוקנה
הסורק נכשל עם שגיאה 407 (Proxy Authentication Required) כי שם הזונה היה לא נכון.

## הפתרון

### 1. פורמט נכון של שם הזונה
Bright Data Scraping Browser דורש שם זונה **ללא** סיומת מספר:
- ✅ **נכון**: `brd-customer-hl_b8df3680-zone-scraping_browser`
- ❌ **לא נכון**: `brd-customer-hl_b8df3680-zone-scraping_browser1`
- ❌ **לא נכון**: `brd-customer-hl_b8df3680-zone-scraping_browser2`

### 2. הגדרת משתני הסביבה ב-Vercel

היכנס ל-Vercel Dashboard:
1. לך ל-**Project Settings** → **Environment Variables**
2. הגדר את המשתנים הבאים:

```
BRIGHT_DATA_USERNAME=brd-customer-hl_b8df3680-zone-scraping_browser
BRIGHT_DATA_PASSWORD=<הסיסמה שלך>
```

### 3. איך למצוא את הפרטים ב-Bright Data

1. היכנס ל-[Bright Data Dashboard](https://brightdata.com/cp/zones)
2. לך ל-**Zones** → **Scraping Browser**
3. תראה את הפרטים:
   - **Zone Name**: `scraping_browser` (ללא מספר!)
   - **Customer ID**: `hl_b8df3680`
   - **Password**: לחץ על "Show Password"

4. בנה את ה-USERNAME:
   ```
   brd-customer-<CUSTOMER_ID>-zone-<ZONE_NAME>
   ```
   דוגמה: `brd-customer-hl_b8df3680-zone-scraping_browser`

### 4. וידוא שהזונה פעילה

ודא ש:
- ✅ הזונה פעילה (Active)
- ✅ יש לך קרדיטים בחשבון
- ✅ ה-Zone Type הוא **Scraping Browser**
- ✅ לא השתמשת בכל הרשת שלך

### 5. בדיקת התיקון

הקוד עכשיו מתקן אוטומטית שמות זונה עם סיומת מספר:
- אם BRIGHT_DATA_USERNAME מכיל `scraping_browser1`, הקוד יתקן אוטומטית ל-`scraping_browser`
- תראה הודעה בלוג: `[v0] [Puppeteer] Fixed zone name: scraping_browser1 -> scraping_browser`

## טיפים נוספים

### בדיקת החיבור
אם עדיין מקבל שגיאה 407, בדוק:
1. האם הסיסמה נכונה
2. האם הזונה פעילה ב-Bright Data Dashboard
3. האם יש קרדיטים בחשבון

### שגיאות נפוצות
- **407 Error**: בעיית אימות - בדוק username/password
- **Timeout**: הזונה עמוסה או לא פעילה
- **Connection refused**: הזונה לא קיימת

## שינויים שבוצעו בקוד

### `lib/scraper/puppeteer-scraper.ts`
1. תיקון אוטומטי של שם הזונה (הסרת סיומת מספר)
2. הודעות שגיאה מפורטות יותר לשגיאת 407
3. ברירת מחדל תקינה: `scraping_browser` במקום `scraping_browser3`

## תמיכה

אם עדיין יש בעיות:
1. בדוק את הלוגים של Vercel
2. ודא שמשתני הסביבה מוגדרים נכון
3. נסה ליצור זונה חדשה ב-Bright Data Dashboard
