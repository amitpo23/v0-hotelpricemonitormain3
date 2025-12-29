# 🤖 AI Research Agent - מדריך מלא

## סקירה כללית

מערכת סוכן אינטליגנטי שמשלבת **Tavily Search API** + **Claude AI** לאיסוף וניתוח מידע חיצוני עבור תחזיות מחירים חכמות.

### מה הסוכן עושה?

1. **🔍 חיפוש באינטרנט** (Tavily):
   - אירועים ב-Tel Aviv (כנסים, פסטיבלים, תחרויות)
   - חדשות תיירות ומלונאות
   - מגמות שוק ותחזיות
   - מזג אוויר והתראות

2. **🧠 ניתוח חכם** (Claude AI):
   - מנתח את כל המידע שנאסף
   - משווה למחירי מתחרים והיסטוריה
   - נותן המלצת מחיר מבוססת AI
   - מסביר את הנימוק בעברית

---

## 🚀 התקנה

### 1. הגדרת Tavily API

#### שלב א': הרשמה
1. גש ל-https://tavily.com
2. הירשם (חינם!)
3. קבל API key

#### שלב ב': הוסף ל-Environment Variables
```bash
# Vercel
Settings → Environment Variables → Add

Name: TAVILY_API_KEY
Value: tvly-xxxxxxxxxx
```

**חבילה חינמית:**
- ✅ 1,000 חיפושים/חודש
- ✅ חיפוש מתקדם (advanced search)
- ✅ תוכן גולמי (raw content)

---

### 2. הגדרת Claude AI

#### שלב א': הרשמה
1. גש ל-https://console.anthropic.com/
2. הירשם ליצור account
3. קבל API key

#### שלב ב': הוסף ל-Environment Variables
```bash
Name: ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxx
```

**מחירים:**
- **Claude 3.5 Sonnet**: $3 per 1M input tokens, $15 per 1M output tokens
- בתחזית ממוצעת: ~$0.01-0.03 per request
- **אומדן**: 1,000 תחזיות = $10-30

---

## 📡 API Endpoints

### POST /api/predictions/ai-insights

קבלת תובנות AI מלאות עבור תאריך ומלון ספציפיים.

#### Request:
```bash
curl -X POST https://your-app.vercel.app/api/predictions/ai-insights \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": 1,
    "hotelName": "The Jaffa Hotel",
    "targetDate": "2026-03-15",
    "location": "Tel Aviv"
  }'
```

#### Response:
```json
{
  "success": true,
  "hotelName": "The Jaffa Hotel",
  "targetDate": "2026-03-15",
  "location": "Tel Aviv",
  "aiAnalysis": {
    "insights": "בתאריך זה מתקיים כנס טכנולוגיה בינלאומי בת\"א. הביקוש גבוה מאוד.",
    "recommendation": "increase",
    "confidence": 85,
    "reasoning": "שילוב של אירוע גדול + מזג אוויר נעים + מחירי מתחרים גבוהים"
  },
  "marketIntelligence": {
    "events": [
      {
        "name": "TechCrunch Tel Aviv",
        "date": "2026-03-15",
        "impact": "high",
        "description": "כנס טכנולוגיה בינלאומי עם אלפי משתתפים",
        "source": "https://..."
      }
    ],
    "news": [
      {
        "title": "עלייה של 30% בתיירות לישראל",
        "summary": "...",
        "sentiment": "positive",
        "relevance": 0.9
      }
    ],
    "marketTrends": {
      "summary": "ביקוש גבוה לחדרים בת\"א במרץ 2026",
      "factors": ["אירועי עסקים", "מזג אוויר מצוין", "עונת תיירות"]
    }
  },
  "historicalContext": {
    "avgPrice": 1250,
    "priceRange": { "min": 950, "max": 1800 },
    "dataPoints": 90
  },
  "competitorContext": {
    "avgPrice": 1380,
    "competitors": [
      { "name": "The Norman", "price": 1500 },
      { "name": "Brown Beach House", "price": 1400 }
    ]
  },
  "occupancyContext": {
    "current": 75,
    "level": "medium"
  },
  "metadata": {
    "researchedAt": "2025-12-27T10:00:00Z",
    "dataQuality": {
      "hasExternalEvents": true,
      "hasNews": true,
      "hasHistoricalData": true,
      "hasCompetitorData": true
    }
  }
}
```

---

### GET /api/predictions/ai-insights/search?query=xxx

חיפוש מהיר למידע ספציפי.

#### Example:
```bash
curl "https://your-app.vercel.app/api/predictions/ai-insights/search?query=כנסים+בתל+אביב+מרץ+2026"
```

#### Response:
```json
{
  "success": true,
  "query": "כנסים בתל אביב מרץ 2026",
  "result": "נמצאו 3 כנסים מרכזיים: TechCrunch (15.3), DevOps Days (22.3), Digital Summit (29.3)",
  "timestamp": "2025-12-27T10:00:00Z"
}
```

---

## 🎯 תרחישי שימוש

### תרחיש 1: תחזית מחיר יומית

```javascript
// From frontend
const response = await fetch('/api/predictions/ai-insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hotelId: 1,
    hotelName: 'The Jaffa Hotel',
    targetDate: '2026-03-15',
    location: 'Tel Aviv'
  })
});

const data = await response.json();

// Display AI recommendation
console.log(`המלצה: ${data.aiAnalysis.recommendation}`);
console.log(`ביטחון: ${data.aiAnalysis.confidence}%`);
console.log(`נימוק: ${data.aiAnalysis.reasoning}`);
```

---

### תרחיש 2: תחזיות לטווח (שילוב עם Enhanced)

```javascript
// Get enhanced predictions for 30 days
const enhanced = await fetch('/api/predictions/enhanced', {
  method: 'POST',
  body: JSON.stringify({
    hotelId: 1,
    targetDates: next30Days,
    location: 'Tel Aviv'
  })
});

// For specific high-value dates, get AI insights
const highValueDates = enhanced.predictions
  .filter(p => p.demandLevel === 'high')
  .map(p => p.date);

const aiInsights = await Promise.all(
  highValueDates.slice(0, 5).map(date =>
    fetch('/api/predictions/ai-insights', {
      method: 'POST',
      body: JSON.stringify({
        hotelId: 1,
        hotelName: 'The Jaffa Hotel',
        targetDate: date,
        location: 'Tel Aviv'
      })
    })
  )
);
```

---

### תרחיש 3: ניטור אירועים

```javascript
// Search for upcoming events
const eventsSearch = await fetch(
  '/api/predictions/ai-insights/search?query=אירועים+תל+אביב+קיץ+2026'
);

const result = await eventsSearch.json();
console.log('אירועים קרובים:', result.result);
```

---

## 🏗️ ארכיטקטורה

```
┌─────────────────────────────────────────────┐
│  Frontend / API Request                     │
│  POST /api/predictions/ai-insights          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Internet Agent (Tavily)                    │
│  ┌─────────────────────────────────────┐   │
│  │ 🔍 Search Events                    │   │
│  │ 🔍 Search News                      │   │
│  │ 🔍 Search Market Trends             │   │
│  └─────────────────────────────────────┘   │
│  Returns: External Market Data              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Data Collection (Parallel)                 │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ Historical  │ │ Competitor  │           │
│  │ Prices      │ │ Prices      │           │
│  └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ Occupancy   │ │ Weather     │           │
│  │ Rate        │ │ Forecast    │           │
│  └─────────────┘ └─────────────┘           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Claude AI Analysis                         │
│  🧠 Analyzes all collected data             │
│  🧠 Compares historical trends              │
│  🧠 Evaluates external factors              │
│  🧠 Generates recommendation + reasoning    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Response with Comprehensive Insights       │
│  • AI Recommendation                        │
│  • Market Intelligence                      │
│  • Historical Context                       │
│  • Competitor Analysis                      │
│  • Occupancy Data                           │
└─────────────────────────────────────────────┘
```

---

## 💰 עלויות ותקציב

### Tavily (חיפוש)
- **חבילה חינמית**: 1,000 חיפושים/חודש
- **Pro**: $99/חודש = חיפושים ללא הגבלה
- **צריכה**: ~3 חיפושים per request
- **אומדן**: 300 תחזיות/חודש בחינם

### Claude AI (ניתוח)
- **Claude 3.5 Sonnet**: $3 input / $15 output per 1M tokens
- **Per Request**: ~1,500 input + 500 output tokens
- **עלות**: ~$0.01-0.03 per request
- **אומדן**: 1,000 תחזיות = $10-30/חודש

### OpenWeather (מזג אוויר)
- **חינם**: 1,000 calls/day
- **תשלום**: מיותר

### **סה"כ עלות חודשית משוערת**:
- **דרגה חינמית**: $0 (עד 300 תחזיות AI)
- **שימוש בינוני**: $10-30/חודש (1,000 תחזיות)
- **שימוש גבוה**: $50-100/חודש (3,000+ תחזיות)

---

## 🔧 התאמה אישית

### שינוי מודל Claude

```typescript
// lib/llm/claude-client.ts
export async function queryClaude(...) {
  // Change model here:
  model: 'claude-3-5-sonnet-20241022',  // Current
  // model: 'claude-3-opus-20240229',    // More powerful, $$$
  // model: 'claude-3-haiku-20240307',   // Faster, cheaper
}
```

### שינוי עומק חיפוש Tavily

```typescript
// lib/research/internet-agent.ts
const results = await searchTavily(query, {
  searchDepth: 'advanced',  // 'basic' | 'advanced'
  maxResults: 5,            // 1-20
});
```

### הוספת סוג אירוע נוסף

```typescript
// lib/research/internet-agent.ts
export async function researchEvents(...) {
  const query = `אירועים ב${location} ${date} 
    כנסים פסטיבלים קונצרטים 
    תחרויות ספורט מופעים`;  // ← הוסף כאן
}
```

---

## 🧪 בדיקה מקומית

### 1. הגדר API Keys
```bash
# .env.local
TAVILY_API_KEY=tvly-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
OPENWEATHER_API_KEY=xxx
```

### 2. הרץ את השרת
```bash
npm run dev
```

### 3. בדוק את ה-Endpoint
```bash
curl -X POST http://localhost:3000/api/predictions/ai-insights \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": 1,
    "hotelName": "The Jaffa Hotel",
    "targetDate": "2026-03-15"
  }'
```

### 4. בדוק חיפוש מהיר
```bash
curl "http://localhost:3000/api/predictions/ai-insights/search?query=כנסים+תל+אביב"
```

---

## 📊 ניטור וביצועים

### לוגים

```typescript
// הכל נרשם אוטומטית:
[InternetAgent] Searching: אירועים בTel Aviv 2026-03-15
[InternetAgent] Found 3 events
[InternetAgent] Found 5 news items
[AIInsights] Step 1: Researching external data...
[AIInsights] Step 4: Analyzing with Claude AI...
[AIInsights] Analysis complete
```

### בדיקת איכות

```javascript
const response = await fetch('/api/predictions/ai-insights', {...});
const data = await response.json();

// Check data quality
console.log(data.metadata.dataQuality);
// {
//   hasExternalEvents: true,
//   hasNews: true,
//   hasHistoricalData: true,
//   hasCompetitorData: true
// }
```

---

## ⚠️ טיפול בשגיאות

### חוסר API Key
```json
{
  "error": "TAVILY_API_KEY is not set in environment variables"
}
```
**פתרון**: הוסף את ה-key ב-Vercel Environment Variables

### חריגה ממכסה
```json
{
  "error": "Tavily API error: 429 - Rate limit exceeded"
}
```
**פתרון**: חכה לאיפוס (1 חודש) או שדרג ל-Pro

### Claude timeout
```json
{
  "error": "Claude API error: 504 - Gateway timeout"
}
```
**פתרון**: הפחת את כמות הנתונים או הגדל maxDuration

---

## 🔮 שיפורים עתידיים

### Phase 2 (Optional)
- [ ] Multi-agent system (מספר סוכנים במקביל)
- [ ] Memory/caching (שמירת תוצאות)
- [ ] Real-time alerts (התראות על אירועים חדשים)
- [ ] Competitor monitoring (מעקב אוטומטי אחרי מתחרים)
- [ ] Price optimization loop (לולאת אופטימיזציה)

### Phase 3 (Advanced)
- [ ] Custom ML models on features
- [ ] A/B testing framework
- [ ] Automated price adjustments
- [ ] Multi-market support

---

## 📚 קישורים

- **Tavily Docs**: https://docs.tavily.com
- **Claude API**: https://docs.anthropic.com/claude/reference
- **OpenWeather**: https://openweathermap.org/api

---

**סטטוס**: ✅ מוכן לשימוש!  
**תאריך**: דצמבר 2025  
**גרסה**: 1.0
