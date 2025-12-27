# 🔄 איך להחליף Apify Actor

## דרך מהירה

ערוך את הקובץ: [lib/scraper/apify-config.ts](lib/scraper/apify-config.ts)

שנה את השורה:
```typescript
ACTOR_ID: "voyager/booking-scraper",  // ← שנה כאן
```

## אפשרויות זמינות

### 1. Voyager Booking Scraper (מומלץ) ⭐
```typescript
ACTOR_ID: "voyager/booking-scraper",
```
- ✅ תמיכה מעולה בתאריכים
- ✅ מהיר ויציב
- ❌ עלות גבוהה יחסית (~$0.10-0.30 לריצה)

### 2. Dtrungtin Booking Scraper (חלופה טובה)
```typescript
ACTOR_ID: "dtrungtin/booking-scraper",
```
- ✅ יחס מחיר/ביצועים טוב
- ✅ יציב
- ⚠️ איטי יותר (~$0.05-0.15 לריצה)

### 3. Community Scraper (זול)
```typescript
ACTOR_ID: "oeiQgfg5fsmIJB7Cn",
```
- ✅ לפעמים חינמי
- ❌ תמיכה מוגבלת בתאריכים
- ❌ פחות אמין (~$0.01-0.05 לריצה)

## לאחר השינוי

1. **שמור את הקובץ**
2. **אתחל את השרת**:
   ```bash
   # הפסק את השרת (Ctrl+C)
   pnpm dev
   ```
3. **בדוק שהשינוי עבד**:
   ```bash
   node test-apify-with-dates.mjs
   ```

## בדיקת הגדרות נוכחיות

```bash
npx tsx lib/scraper/apify-config.ts
```

זה יציג:
```
🤖 Apify Actor Configuration
==================================================
Current Actor: Voyager Booking Scraper
ID: voyager/booking-scraper
Avg Cost: $0.10-0.30
Memory: 2048MB

✅ Pros:
  - Best date support
  - Reliable
  - Fast

⚠️ Cons:
  - Higher cost
==================================================
```

## שאלות נפוצות

### Q: מה קורה אם האקטור יקר מדי?
**A:** החלף ל-`dtrungtin/booking-scraper` או `oeiQgfg5fsmIJB7Cn`

### Q: איך בודקים כמה קרדיט נותר?
**A:** היכנס ל-[Apify Console → Billing](https://console.apify.com/billing)

### Q: אפשר להשתמש בסקרייפר חינמי?
**A:** כן! השתמש ב-Python scraper במקום:
```bash
python3 scraper_v5.py "URL" 1
```

### Q: האקטור נכשל, מה עושים?
**A:** 
1. בדוק לוגים ב-[Apify Console → Runs](https://console.apify.com/actors/runs)
2. וודא שיש תאריכים ב-URL
3. נסה Actor אחר
4. חזור ל-Python scraper

## סיכום מהיר

| Actor | מחיר | מהירות | אמינות | תאריכים |
|-------|------|--------|---------|----------|
| voyager/booking-scraper | 💰💰💰 | ⚡⚡⚡ | ✅✅✅ | ✅✅✅ |
| dtrungtin/booking-scraper | 💰💰 | ⚡⚡ | ✅✅ | ✅✅ |
| oeiQgfg5fsmIJB7Cn | 💰 | ⚡ | ⚠️ | ⚠️ |

**המלצה**: התחל עם `voyager/booking-scraper`. אם זה יקר, עבור ל-`dtrungtin/booking-scraper`.
