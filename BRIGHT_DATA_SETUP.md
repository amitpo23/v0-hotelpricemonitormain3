# Booking.com Scraper Setup Guide

## למה Bright Data לא עובד ב-Vercel?

⚠️ **חשוב**: Vercel Serverless Functions **לא יכולות** להריץ Puppeteer או כלי browser automation אחרים.

### הסיבות:
1. **אין Chrome/Chromium** - Vercel לא מתקין דפדפנים
2. **מגבלת Bundle Size** - 50MB מקסימום, Puppeteer הוא ~400MB
3. **אין תהליכי דפדפן** - Serverless לא תומך בתהליכים ארוכים
4. **Timeout קצר** - מקסימום 60 שניות לפונקציה

## הפתרון המומלץ: Tavily + ScraperAPI

### אפשרות 1: Tavily API (מומלץ - הכי מהיר)

1. קבל API key מ-[Tavily.com](https://tavily.com)
2. הגדר ב-Vercel **Environment Variables**:
\`\`\`
TAVILY_API_KEY=tvly-xxxxxxxxxx
\`\`\`

### אפשרות 2: ScraperAPI (עוקף חסימות)

1. קבל API key מ-[ScraperAPI.com](https://www.scraperapi.com/)
2. הגדר ב-Vercel **Environment Variables**:
\`\`\`
SCRAPER_API_KEY=your-api-key-here
\`\`\`

### אפשר להשתמש בשניהם!

הסקרייפר ינסה לפי הסדר:
1. **Tavily** - הכי מהיר, AI-powered
2. **ScraperAPI** - עוקף CAPTCHA וחסימות
3. **Direct Booking.com API** - חינמי אבל יכול להיחסם
4. **HTML Parsing** - Fallback אחרון

## איך זה עובד

\`\`\`
scrapeBookingPrices()
    │
    ├── Method 1: Tavily (needs TAVILY_API_KEY)
    │   └── AI-powered search, returns prices from booking.com
    │
    ├── Method 2: ScraperAPI (needs SCRAPER_API_KEY)
    │   └── Renders JavaScript, bypasses CAPTCHA
    │
    ├── Method 3: Booking.com Search API
    │   └── Direct fetch, may be blocked
    │
    └── Method 4: Direct HTML
        └── Autocomplete API + hotel page fetch
\`\`\`

## הגדרת Environment Variables ב-v0

1. לחץ על **Vars** בסיידבר השמאלי
2. הוסף את המשתנים:
   - `TAVILY_API_KEY` - מ-tavily.com
   - `SCRAPER_API_KEY` (אופציונלי) - מ-scraperapi.com

## בדיקת הסקרייפר

הרץ סריקה ובדוק ב-Vercel Logs:
- `[v0] [Tavily] Starting search for...` - Tavily עובד
- `[v0] [ScraperAPI] Starting scrape for...` - ScraperAPI עובד
- `[v0] [BookingScraper] Method X SUCCESS!` - הסקרייפר מצא מחירים

## שגיאות נפוצות

| שגיאה | סיבה | פתרון |
|-------|------|-------|
| `Tavily returned no results` | API key לא תקין או אין תוצאות | בדוק API key |
| `ScraperAPI Error 401` | API key לא תקין | בדוק API key |
| `All methods failed` | כל השיטות נכשלו | ודא ש-API keys מוגדרים |
| `captcha` בלוגים | האתר חוסם | השתמש ב-ScraperAPI |

## תמיכה

אם יש בעיות:
1. בדוק את ה-Vercel Logs
2. ודא ש-Environment Variables מוגדרים נכון
3. נסה להריץ סריקה עם מלון אחר
