#!/bin/bash
# סקריפט מהיר לבדיקת מצב מערכת Predictions

echo "================================================"
echo "🔍 בדיקת מצב מערכת Predictions"
echo "================================================"
echo ""

# Check .env file
echo "1️⃣  בודק קובץ .env..."
if [ -f ".env" ]; then
    echo "   ✅ קובץ .env קיים"
    
    # Check required variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env; then
        echo "   ✅ משתני Supabase מוגדרים"
    else
        echo "   ❌ משתני Supabase חסרים!"
        echo "   הרץ: ./setup-env.sh"
        exit 1
    fi
    
    # Check optional
    if grep -q "^OPENWEATHER_API_KEY=" .env; then
        echo "   ✅ OpenWeather מוגדר (שיפור +5-8%)"
    else
        echo "   ⚠️  OpenWeather לא מוגדר (אופציונלי)"
    fi
    
    if grep -q "^ANTHROPIC_API_KEY=" .env; then
        echo "   ✅ Anthropic מוגדר"
    else
        echo "   ⚠️  Anthropic לא מוגדר (אופציונלי)"
    fi
    
    if grep -q "^TAVILY_API_KEY=" .env; then
        echo "   ✅ Tavily מוגדר"
    else
        echo "   ⚠️  Tavily לא מוגדר (אופציונלי)"
    fi
else
    echo "   ❌ קובץ .env לא קיים!"
    echo ""
    echo "   הרץ את הפקודה הבאה להגדרה:"
    echo "   ./setup-env.sh"
    exit 1
fi

echo ""
echo "2️⃣  בודק חיבור לטבלאות..."
if command -v node &> /dev/null; then
    node check-tables.mjs 2>&1 | head -20
else
    echo "   ⚠️  Node.js לא מותקן"
fi

echo ""
echo "3️⃣  בודק מצב הקבצים..."
FILES=(
    "app/predictions/page.tsx"
    "app/predictions/enhanced-prediction-card.tsx"
    "app/api/predictions/generate/route.ts"
    "app/api/predictions/enhanced/route.ts"
    "lib/prediction-algorithms.ts"
    "lib/external/weather-service.ts"
    "lib/analytics/booking-velocity.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ חסר: $file"
    fi
done

echo ""
echo "================================================"
echo "📊 סיכום"
echo "================================================"

if [ -f ".env" ]; then
    echo "✅ הגדרת סביבה: תקינה"
    echo ""
    echo "🚀 מה הלאה?"
    echo ""
    echo "1. הפעל את השרת:"
    echo "   pnpm dev"
    echo ""
    echo "2. פתח דפדפן:"
    echo "   http://localhost:3000/predictions"
    echo ""
    echo "3. צור חיזויים:"
    echo "   לחץ 'Generate Predictions'"
    echo ""
else
    echo "❌ דרוש הגדרה"
    echo ""
    echo "הרץ: ./setup-env.sh"
    echo ""
fi
