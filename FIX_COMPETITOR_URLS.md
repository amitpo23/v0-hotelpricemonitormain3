# 🔧 Fix Competitor URLs in Database

## הבעיה
ה-URLs בטבלת `hotel_competitors` הם search URLs במקום hotel page URLs.

## הפתרון
צריך לעדכן את ה-URLs לפורמט הנכון של Booking.com:

```
https://www.booking.com/hotel/COUNTRY_CODE/hotel-slug.html
```

## איך לתקן:

### אופציה 1: ידנית ב-Supabase Dashboard
1. פתח את Supabase Dashboard
2. לך לטבלת `hotel_competitors`
3. עדכן את העמודה `booking_url` עם URLs תקינים

### אופציה 2: דרך SQL
```sql
-- Example: Update URLs for specific hotels
UPDATE hotel_competitors 
SET booking_url = 'https://www.booking.com/hotel/il/cucu.html'
WHERE competitor_hotel_name = 'coco hotel';

UPDATE hotel_competitors 
SET booking_url = 'https://www.booking.com/hotel/il/debrah-brown-tel-aviv.html'
WHERE competitor_hotel_name = 'Debrah Brown';

-- Add more updates as needed...
```

## אחרי התיקון
הרץ שוב את הסריקה:
```bash
curl -X POST http://localhost:3000/api/scraper/run-full \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "716e1e8f-3537-4f67-875d-de3a89642175",
    "daysToScan": 30,
    "useRealScraping": true
  }'
```

והפעם זה יעבוד! 🎯
