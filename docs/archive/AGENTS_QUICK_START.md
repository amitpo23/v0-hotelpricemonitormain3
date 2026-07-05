# 🚀 Multi-Agent System - Quick Start

## סקירה מהירה

המערכת כוללת **9 agents** שאוספים נתונים אמיתיים לחיזוי מחירים:

| Agent | תיאור | מקור | השפעה |
|-------|-------|------|--------|
| 🎯 **Trends** | Google Trends | SerpAPI | ציון עניין 0-100 |
| 💰 **Budget** | ניתוח תקציב | DB | לחץ תמחור 0.95-1.18x |
| 🚀 **Velocity** | קצב הזמנות | DB | מגמת ביקוש |
| 🏨 **Competitor** | מחירי מתחרים | Apify/DB | מיקום בשוק |
| 🕎 **Holidays** | חגים ישראליים | Hebcal | השפעה עד x1.45 |
| 🎉 **Events** | אירועים | Tavily | כנסים/פסטיבלים |
| 📜 **Historical** | מחירים אשתקד | DB | מגמות שנתיות |
| 📊 **Statistics** | סטטיסטיקה | CBS/Tavily | מחיר שוק ממוצע |
| 🎛️ **Orchestrator** | תיאום | - | מריץ הכל במקביל |

## הגדרת API Keys

```bash
# .env
SERPAPI_KEY=xxx           # Google Trends (אופציונלי)
APIFY_API_TOKEN=xxx       # Competitor scraping (אופציונלי)
TAVILY_API_KEY=xxx        # Events (מומלץ)
```

**ללא API keys המערכת עדיין תעבוד** עם fallbacks!

## שימוש

### 1. חיזוי בסיסי (90 ימים)
```bash
POST /api/predictions/generate
{
  "hotelIds": ["scarlet-tlv-001"],
  "predictionDays": 90
}
```

### 2. חיזוי לחודשים ספציפיים
```bash
POST /api/predictions/generate
{
  "hotelIds": ["scarlet-tlv-001"],
  "predictionDays": 90,
  "selectedMonths": [4, 5, 6],  # אפריל-יוני
  "selectedYear": 2026
}
```

### 3. חיזוי קצר טווח עם real-time competitors
```bash
POST /api/predictions/generate?realTimeCompetitors=true
{
  "hotelIds": ["scarlet-tlv-001"],
  "predictionDays": 7
}
```

## דוגמת פלט

```json
{
  "predictions": [
    {
      "hotel_id": "scarlet-tlv-001",
      "prediction_date": "2026-04-18",
      "predicted_price": 2185,
      "base_price": 550,
      "predicted_demand": "very_high",
      "confidence_score": 0.92,
      "recommendation": "העלה מחיר - פסח",
      "factors": {
        "seasonality": "passover_high",
        "seasonality_factor": "1.40",
        "is_weekend": false,
        "events": ["Passover (Day 3/7)"],
        "occupancy_rate": 95,
        "budget_gap": -40000,
        "budget_pressure": "1.15",
        "booking_velocity": "accelerating",
        "velocity_factor": "1.08",
        "google_trends_score": 95,
        "competitor_avg": 920,
        "price_vs_competitor": "+137.5%"
      }
    }
  ]
}
```

## איך זה עובד?

### תהליך חישוב מחיר:

```
מחיר בסיס: ₪550

1. עונתיות
   → יולי (קיץ): x1.25
   → סוף שבוע: x1.12
   → Lead time 14 ימים: x1.03
   = ₪794

2. דינמיקה
   → תפוסה 75%: x1.2
   → חג (מצעד גאווה): x1.4
   → מתחרים ממוצע ₪850: x1.03
   = ₪1,372

3. עסקי
   → תקציב (פער -₪30k): x1.12
   → Velocity (עולה): x1.05
   → Trends (92/100): x1.02
   = ₪1,641

4. Floor Protection
   → max(₪300, ₪850, ₪720, ₪412) = ₪850
   → final = max(₪1,641, ₪850) = ₪1,641

5. עיגול
   → ₪1,640
```

## Agents במקביל

המערכת מריצה ב-3 שלבים:

**Stage 1 (מהיר, <2s)**: Budget, Velocity, Holidays  
**Stage 2 (בינוני, <10s)**: Historical, Statistics, Trends  
**Stage 3 (איטי, <20s)**: Events, Competitors

## Logs דוגמה

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 ENHANCED MULTI-AGENT ORCHESTRATOR v2 - STARTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Hotel: Scarlet Hotel
📅 Target dates: 90 dates
💰 Base price: ₪550
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STAGE 1: Quick Internal Data...
✅ [Budget] Gap: ₪-15k, Pressure: 0.95x
✅ [Velocity] Trend: increasing, Impact: 1.05x
✅ [Holidays] 23 days with holidays
✨ Stage 1: 1.2s

📈 STAGE 2: Historical & Market Data...
✅ [Historical] 85 dates analyzed
✅ [Statistics] Avg rate: ₪680
✅ [Trends] 90 dates
✨ Stage 2: 8.5s

🌐 STAGE 3: External Data...
✅ [Events] 12 dates with events
✅ [Competitors] 90 dates analyzed
✨ Stage 3: 15.8s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPLETE
⏱️  Total: 15.8s
📊 Sources: budget, velocity, holidays, historical, statistics, trends, events, competitors
🎯 Confidence: 87%
⭐ Quality: excellent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## תיעוד מלא

ראה: [ENHANCED_AGENTS_GUIDE.md](./ENHANCED_AGENTS_GUIDE.md)

## קבצים שנוספו

```
lib/agents/
├── trends-agent.ts          # Google Trends
├── budget-agent.ts          # Budget analysis
├── velocity-agent.ts        # Booking velocity
├── competitor-agent.ts      # Real-time competitors
├── holidays-agent.ts        # Israeli holidays
└── orchestrator-v2.ts       # Enhanced orchestrator

app/api/predictions/generate/
└── route.ts                 # Updated to use v2
```

---

🎉 **המערכת מוכנה!** פשוט תפעיל את ה-API ותיהנה מחיזויים מדויקים מבוססי נתונים אמיתיים.
