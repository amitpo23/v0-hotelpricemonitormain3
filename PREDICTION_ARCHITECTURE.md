# 🎯 מערכת הפרדיקשן - ארכיטקטורה נוכחית

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PREDICTION SYSTEM                               │
│                      (Hotel Price Forecasting)                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────── DATA SOURCES (מקורות נתונים) ────────────────┐
│                                                                │
│  ✅ Supabase Database:                                        │
│     ├─ hotels                  (מלונות)                       │
│     ├─ competitor_daily_prices (מחירי מתחרים) ← קיים         │
│     ├─ daily_prices            (מחירים מומלצים) ← קיים        │
│     ├─ price_predictions       (פרדיקשנים) ← קיים            │
│     ├─ bookings                (הזמנות) ← קיים               │
│     └─ revenue_budgets         (תקציבים) ← קיים אבל לא משומש │
│                                                                │
│  ✅ External APIs:                                             │
│     ├─ OpenWeatherMap          (מזג אוויר) ← עובד           │
│     └─ Perplexity AI           (deep research) ← קיים אבל לא פעיל │
│                                                                │
│  🔴 Missing Tables:                                            │
│     ├─ events                  (אירועים) ← לא קיים!         │
│     ├─ external_data_cache     (cache) ← לא קיים!           │
│     ├─ market_trends           (טרנדים) ← לא קיים!          │
│     └─ weather_history         (היסטוריה) ← לא קיים!        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────── ANALYTICS LAYER (ניתוח נתונים) ──────────────┐
│                                                                │
│  ✅ lib/analytics/:                                            │
│     ├─ booking-velocity.ts     ← מעקב קצב הזמנות            │
│     │   • 7d/30d/90d windows                                 │
│     │   • Trend detection                                     │
│     │   • Momentum analysis                                   │
│     │                                                          │
│     └─ year-over-year.ts       ← השוואות היסטוריות          │
│         • Seasonal patterns                                   │
│         • Growth rate                                         │
│         • Historical trends                                   │
│                                                                │
│  ✅ lib/external/:                                             │
│     └─ weather-service.ts      ← שירות מזג אוויר             │
│         • 5-day forecast                                      │
│         • Impact scoring                                      │
│         • Climatology data                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────── FEATURE ENGINEERING (הכנת נתונים) ──────────────┐
│                                                                │
│  ✅ lib/features/feature-engineering.ts                        │
│                                                                │
│     ┌──────────────── 30+ Features ─────────────────┐        │
│     │                                                 │        │
│     │  📅 Temporal (זמן):                            │        │
│     │     • dayOfWeek, isWeekend                     │        │
│     │     • daysUntilCheckIn                         │        │
│     │     • month, season                            │        │
│     │     • isHoliday                                │        │
│     │                                                 │        │
│     │  📊 Demand (ביקוש):                            │        │
│     │     • currentOccupancy                         │        │
│     │     • bookingVelocity7d/30d/90d                │        │
│     │     • bookingMomentumScore                     │        │
│     │                                                 │        │
│     │  🏨 Competition (מתחרים):                      │        │
│     │     • competitorAvgPrice                       │        │
│     │     • competitorPriceStd                       │        │
│     │     • pricePositionVsCompetitors               │        │
│     │                                                 │        │
│     │  🌤️ Weather (מזג אוויר):                      │        │
│     │     • weatherScore                             │        │
│     │     • weatherFactor                            │        │
│     │     • temperature                              │        │
│     │                                                 │        │
│     │  📈 Historical (היסטוריה):                     │        │
│     │     • yoyPriceChange                           │        │
│     │     • yoySeasonalIndex                         │        │
│     │     • priceHistoryTrend                        │        │
│     │                                                 │        │
│     │  🎪 Events (אירועים):                          │        │
│     │     • eventFactor                              │        │
│     │     • eventProximity                           │        │
│     │                                                 │        │
│     │  📊 Quality (איכות):                           │        │
│     │     • dataQualityScore                         │        │
│     │     • dataCompleteness                         │        │
│     │                                                 │        │
│     └─────────────────────────────────────────────────┘        │
│                                                                │
│     ➜ ML-ready feature vectors                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────── PREDICTION ENGINE (מנוע פרדיקשן) ───────────────┐
│                                                                │
│  ✅ lib/prediction-algorithms.ts                               │
│                                                                │
│     ┌────────────────────────────────────┐                    │
│     │   predictPrice() - אלגוריתם בסיס  │                    │
│     │                                     │                    │
│     │   14 Factors:                      │                    │
│     │   1. Weekend/Weekday      (+15%)   │                    │
│     │   2. Holidays             (+25%)   │                    │
│     │   3. Days Until Date      (±20%)   │                    │
│     │   4. Occupancy            (±30%)   │                    │
│     │   5. Competitor Pricing   (±8%)    │                    │
│     │   6. Demand Score         (±15%)   │                    │
│     │   7. Seasonality          (±20%)   │                    │
│     │   8. Events               (±25%)   │                    │
│     │   9. Weather              (±15%)   │ ← חדש!            │
│     │   10. Booking Velocity    (+15%)   │ ← חדש!            │
│     │   11. Booking Momentum    (+10%)   │ ← חדש!            │
│     │   12. YoY Patterns        (±20%)   │ ← חדש!            │
│     │   13. Price Trend         (±10%)   │                    │
│     │   14. Competitive Position (±8%)   │ ← חדש!            │
│     │                                     │                    │
│     │   Output:                           │                    │
│     │   • Predicted Price                 │                    │
│     │   • Confidence Score (0-100)        │                    │
│     │   • Demand Level                    │                    │
│     │   • Recommendation                  │                    │
│     │   • Price Range (min-max)           │                    │
│     └────────────────────────────────────┘                    │
│                                                                │
│     ┌────────────────────────────────────┐                    │
│     │ predictPriceEnhanced() - מתקדם     │                    │
│     │                                     │                    │
│     │   כל ה-14 גורמים +                 │                    │
│     │   • Real-time weather               │                    │
│     │   • YoY comparison                  │                    │
│     │   • Booking acceleration            │                    │
│     │   • Market intelligence             │                    │
│     └────────────────────────────────────┘                    │
│                                                                │
│  ⚠️ lib/rag/prediction-context.ts (חלקי)                      │
│     ├─ buildPredictionContext()    ← עובד                     │
│     ├─ formatContextForPrompt()    ← עובד                     │
│     └─ combinePredictions()        ← עובד                     │
│                                                                │
│  ⚠️ lib/llm/perplexity-client.ts (לא פעיל)                    │
│     └─ Deep research capability    ← קיים אבל לא משומש        │
│                                                                │
│  🔴 Machine Learning Model (לא קיים!)                         │
│     └─ Trained XGBoost/LightGBM    ← צריך לבנות!             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────── API LAYER (ממשק API) ─────────────────────────┐
│                                                                │
│  ✅ /api/predictions/generate       ← יצירת פרדיקשן          │
│  ✅ /api/predictions/advanced       ← פרדיקשן מתקדם           │
│  ⚠️ /api/predictions/enhanced       ← קיים אבל לא נבדק       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────── UI LAYER (ממשק משתמש) ────────────────────────┐
│                                                                │
│  ✅ /predictions/page.tsx           ← דף פרדיקשנים            │
│  ✅ /predictions/prediction-chat    ← צ'אט AI                 │
│  ✅ /predictions/prediction-chart   ← גרפים                   │
│  ✅ /predictions/yearly-predictions ← תחזית שנתית             │
│                                                                │
└────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════

🔴 MISSING COMPONENTS (רכיבים חסרים):

┌────────────────────────────────────────────────────┐
│  1. DEEP RESEARCH AGENT                            │
│     ❌ Event discovery (אירועים)                  │
│     ❌ Google Trends integration                   │
│     ❌ News monitoring                             │
│     ❌ Flight data analysis                        │
│     ❌ Social media sentiment                      │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  2. MACHINE LEARNING PIPELINE                      │
│     ❌ Model training infrastructure               │
│     ❌ Trained model (XGBoost/LightGBM)            │
│     ❌ Model versioning                            │
│     ❌ A/B testing framework                       │
│     ❌ Performance monitoring                      │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  3. BUDGET INTELLIGENCE                            │
│     ⚠️ Budget data exists but not used             │
│     ❌ Budget-aware pricing logic                  │
│     ❌ Autopilot optimization                      │
│     ❌ Revenue pacing alerts                       │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  4. EVENT MANAGEMENT SYSTEM                        │
│     ❌ Events table in database                    │
│     ❌ Automatic event discovery                   │
│     ❌ Impact scoring per event                    │
│     ❌ Event calendar integration                  │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  5. DATA CACHING LAYER                             │
│     ❌ external_data_cache table                   │
│     ❌ API call optimization                       │
│     ❌ Historical data storage                     │
└────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

📊 SYSTEM HEALTH SCORE:

  ✅ Data Collection:        85% (good)
  ✅ Feature Engineering:    90% (excellent)
  ✅ Basic Algorithms:       80% (good)
  ⚠️ Advanced Features:      50% (partial)
  ⚠️ Budget Integration:     30% (weak)
  🔴 Deep Research:          10% (minimal)
  🔴 Machine Learning:        0% (missing)
  ⚠️ Event Management:       40% (hardcoded)

  Overall: 60% Complete ⚠️

═══════════════════════════════════════════════════════════════════
```
