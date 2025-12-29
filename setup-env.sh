#!/bin/bash

# 🔧 סקריפט להגדרת משתני סביבה למערכת Predictions

echo "================================================"
echo "🔧 Setup Environment Variables for Predictions"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  קובץ .env כבר קיים!${NC}"
    echo "האם להחליף אותו? (y/n)"
    read -r replace
    if [ "$replace" != "y" ]; then
        echo "ביטול..."
        exit 0
    fi
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup נוצר${NC}"
fi

echo ""
echo "📝 אנא הכנס את הפרטים הבאים:"
echo "(לחץ Enter לדלג על אופציונלי)"
echo ""

# Supabase (Required)
echo "=== Supabase (חובה) ==="
echo "איפה למצוא: https://supabase.com/dashboard -> הפרויקט שלך -> Settings -> API"
echo ""

read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -sp "Supabase Service Role Key (secret): " SUPABASE_SERVICE_KEY
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ פרטי Supabase חסרים - אלה הכרחיים!${NC}"
    exit 1
fi

echo ""
echo "=== APIs אופציונליים (לשיפור דיוק החיזויים) ==="
echo ""

# Apify
echo "Apify API Key (לסריקות):"
echo "איפה: https://console.apify.com/account/integrations"
read -p "APIFY_API_KEY (או Enter לדלג): " APIFY_KEY

# OpenWeather
echo ""
echo "OpenWeather API Key (מזג אוויר - שיפור של 5-8%):"
echo "איפה: https://openweathermap.org/api (חינם: 1000 calls/day)"
read -p "OPENWEATHER_API_KEY (או Enter לדלג): " OPENWEATHER_KEY

# Anthropic
echo ""
echo "Anthropic/Claude API Key (AI insights):"
echo "איפה: https://console.anthropic.com"
read -p "ANTHROPIC_API_KEY (או Enter לדלג): " ANTHROPIC_KEY

# Tavily
echo ""
echo "Tavily API Key (חיפוש אירועים - חינם 1000/month):"
echo "איפה: https://tavily.com"
read -p "TAVILY_API_KEY (או Enter לדלג): " TAVILY_KEY

# Perplexity
echo ""
echo "Perplexity API Key (market intelligence):"
read -p "PERPLEXITY_API_KEY (או Enter לדלג): " PERPLEXITY_KEY

# Create .env file
echo ""
echo "📝 יוצר קובץ .env..."

cat > .env << EOF
# ================================================================
# 🔐 משתני סביבה למערכת ניטור מחירי מלונות
# ================================================================
# נוצר אוטומטית ב-$(date)
# ================================================================

# ============================================
# 🗄️  Supabase Configuration (חובה)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# ============================================
# 🔍 Apify Configuration (לסריקות)
# ============================================
EOF

if [ -n "$APIFY_KEY" ]; then
    echo "APIFY_API_KEY=$APIFY_KEY" >> .env
else
    echo "# APIFY_API_KEY=your_apify_api_key" >> .env
fi

cat >> .env << EOF

# ============================================
# 🤖 AI & External Services (אופציונלי)
# ============================================
# משפרים את דיוק החיזויים ב-50-73%
# ============================================

EOF

if [ -n "$OPENWEATHER_KEY" ]; then
    echo "OPENWEATHER_API_KEY=$OPENWEATHER_KEY" >> .env
else
    echo "# OPENWEATHER_API_KEY=your_openweather_key" >> .env
fi

if [ -n "$ANTHROPIC_KEY" ]; then
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> .env
else
    echo "# ANTHROPIC_API_KEY=your_anthropic_key" >> .env
fi

if [ -n "$TAVILY_KEY" ]; then
    echo "TAVILY_API_KEY=$TAVILY_KEY" >> .env
else
    echo "# TAVILY_API_KEY=your_tavily_key" >> .env
fi

if [ -n "$PERPLEXITY_KEY" ]; then
    echo "PERPLEXITY_API_KEY=$PERPLEXITY_KEY" >> .env
else
    echo "# PERPLEXITY_API_KEY=your_perplexity_key" >> .env
fi

cat >> .env << EOF

# ============================================
# ⚙️  Application Configuration
# ============================================
NODE_ENV=development

# ============================================
# 📊 Optional: Analytics & Monitoring
# ============================================
# SENTRY_DSN=your_sentry_dsn
# GOOGLE_ANALYTICS_ID=your_ga_id

EOF

echo -e "${GREEN}✅ קובץ .env נוצר בהצלחה!${NC}"
echo ""

# Test connection
echo "🔍 בודק חיבור ל-Supabase..."
echo ""

node -e "
import('dotenv').then(dotenv => {
  dotenv.config();
  return import('@supabase/supabase-js');
}).then(({ createClient }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  return supabase.from('hotels').select('count');
}).then(({ data, error }) => {
  if (error) {
    console.log('❌ שגיאה בחיבור:', error.message);
    process.exit(1);
  }
  console.log('✅ חיבור תקין ל-Supabase!');
  process.exit(0);
}).catch(err => {
  console.log('⚠️  לא ניתן לבדוק חיבור (זה בסדר אם אתה ב-Codespace)');
  console.log('הפעל מחדש את dev server: pnpm dev');
});
" 2>/dev/null || echo -e "${YELLOW}⚠️  לא ניתן לבדוק חיבור כרגע${NC}"

echo ""
echo "================================================"
echo "🎉 הגדרה הושלמה!"
echo "================================================"
echo ""
echo "מה הלאה?"
echo ""
echo "1️⃣  הפעל את השרת:"
echo "   pnpm dev"
echo ""
echo "2️⃣  בדוק שהחיבור עובד:"
echo "   node check-tables.mjs"
echo ""
echo "3️⃣  פתח את ה-UI:"
echo "   http://localhost:3000/predictions"
echo ""
echo "4️⃣  צור חיזויים:"
echo "   לחץ על 'Generate Predictions' ב-UI"
echo ""
echo "📚 לפרטים נוספים: FIX_PREDICTIONS_UI.md"
echo ""
