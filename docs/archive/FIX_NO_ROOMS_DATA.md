# 🔧 תיקון בעיית "No rooms data found"

## הבעיה
כשה-Apify Actor סורק מלונות, הוא מחזיר אזהרה:
```
WARN  No rooms data found in main data script
WARN  You aren't providing both check-in and checkout dates, some information will be missing
```

## הסיבה
Booking.com לא מציג מחירי חדרים ללא תאריכי check-in ו-check-out. בלי תאריכים, האתר מציג רק מידע כללי על המלון.

## הפתרון שיושם

### שינוי 1: בניית URL עם תאריכים
קובץ: `lib/scraper/apify-booking-scraper.ts`

```typescript
// לפני:
const input = {
  startUrls: [{ url: options.bookingUrl }],
  checkIn: options.checkIn,
  checkOut: options.checkOut,
  // ...
}

// אחרי:
// בונה URL מלא עם תאריכים כ-query parameters
let urlWithDates = options.bookingUrl
const url = new URL(options.bookingUrl)
url.searchParams.set('checkin', options.checkIn)
url.searchParams.set('checkout', options.checkOut)
url.searchParams.set('group_adults', String(options.adults || 2))
url.searchParams.set('no_rooms', String(options.rooms || 1))
url.searchParams.set('selected_currency', 'ILS')
urlWithDates = url.toString()

const input = {
  startUrls: [{ url: urlWithDates }],
  checkIn: options.checkIn,
  checkOut: options.checkOut,
  // ...
}
```

**מדוע זה עוזר?**
- Booking.com קורא את הפרמטרים מה-URL
- לא כל Actor יודע לבנות את ה-URL הנכון מהפרמטרים בנפרד
- עכשיו אנחנו שולחים URL מוכן לשימוש

### שינוי 2: שדרוג Actor
החלפתי את ה-Actor מ-`oeiQgfg5fsmIJB7Cn` ל-`voyager/booking-scraper` שתומך טוב יותר בתאריכים.

## בדיקה

### אופציה 1: בדיקה מהקוד
```bash
node test-apify-with-dates.mjs
```

זה יריץ סריקה לדוגמה עם תאריכים ויראה אם מתקבלים מחירים.

### אופציה 2: בדיקה דרך ה-API
```bash
curl -X POST http://localhost:3000/api/scans/execute \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "YOUR_HOTEL_ID",
    "start_date": "2026-02-15",
    "days_to_scan": 3
  }'
```

### אופציה 3: בדיקה ב-Apify Console
אם אתה מריץ את האקטור ישירות ב-[Apify Console](https://console.apify.com):

1. פתח את האקטור
2. לחץ על "Try it"
3. הוסף Input כזה:

```json
{
  "startUrls": [
    {
      "url": "https://www.booking.com/hotel/us/the-plaza.html?checkin=2026-02-15&checkout=2026-02-16&group_adults=2&no_rooms=1&selected_currency=ILS"
    }
  ],
  "checkIn": "2026-02-15",
  "checkOut": "2026-02-16",
  "adults": 2,
  "rooms": 1,
  "maxItems": 10,
  "currency": "ILS",
  "language": "he"
}
```

4. הפעל את האקטור
5. בדוק בלוגים - לא אמורה להיות יותר אזהרה על תאריכים חסרים

## תוצאות מצופות

### ✅ הצלחה
```
INFO  Extracting detail... {"url":"https://www.booking.com/hotel/us/the-plaza.html?checkin=2026-02-15..."}
INFO  Detail extracted {"rooms": [...], "price": 450, "currency": "ILS"}
INFO  Saving merged hotel detail {"countryCode":"us","hotelName":"the-plaza"}
```

### ❌ עדיין יש בעיה
```
WARN  No rooms data found in main data script
```

**אם זה קורה:**
1. וודא שהתאריכים לא רחוקים מדי (מקסימום 330 ימים קדימה)
2. בדוק שה-URL תקין עם `console.log(urlWithDates)`
3. נסה Actor אחר: `dtrungtin/booking-scraper`
4. בדוק שיש APIFY_API_KEY תקני

## Actors מומלצים

| Actor ID | יתרונות | חסרונות |
|----------|----------|----------|
| `voyager/booking-scraper` | 🟢 תומך בתאריכים, מהיר | 🔴 עלות גבוהה יחסית |
| `dtrungtin/booking-scraper` | 🟢 זול, יציב | 🟡 איטי יותר |
| `oeiQgfg5fsmIJB7Cn` | 🟢 חינמי לפעמים | 🔴 לא תמיד תומך בתאריכים |

## שאלות נפוצות

### Q: למה צריך תאריכים?
**A:** Booking.com לא מציג מחירים ללא תאריכי הזמנה. ללא check-in/out, האתר רק מציג מידע כללי.

### Q: מה אם התאריכים רחוקים מדי?
**A:** Booking.com מגביל לבערך 330 ימים קדימה. אם התאריך רחוק יותר, לא יהיו מחירים.

### Q: איך בודקים שהתיקון עבד?
**A:** הרץ `node test-apify-with-dates.mjs` ובדוק שאין אזהרה "You aren't providing...dates" בלוגים.

### Q: האקטור החדש יקר מדי, מה עושים?
**A:** 
1. חזור ל-`oeiQgfg5fsmIJB7Cn` ב-[lib/scraper/apify-booking-scraper.ts](lib/scraper/apify-booking-scraper.ts#L79)
2. וודא ש-URL מכיל תאריכים
3. או השתמש ב-Python scraper (`scraper_v5.py`) שחינמי

## סיכום
✅ URL עכשיו כולל תאריכים  
✅ Actor שודרג לגרסה טובה יותר  
✅ יש סקריפט בדיקה  
✅ Documentation מעודכן  

הבעיה צריכה להיפתר! 🎉
