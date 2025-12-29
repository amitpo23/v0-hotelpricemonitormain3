#!/bin/bash

# פתרון מהיר - העתקה ידנית מ-Vercel

echo "================================================"
echo "📋 העתק משתני סביבה מ-Vercel (ידני)"
echo "================================================"
echo ""
echo "1️⃣  לך לדף הזה:"
echo "   https://vercel.com/amitpo23/v0-hotelpricemonitormain3/settings/environment-variables"
echo ""
echo "2️⃣  העתק את הערכים הבאים:"
echo ""
echo "   • NEXT_PUBLIC_SUPABASE_URL"
echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   • SUPABASE_SERVICE_ROLE_KEY"
echo "   • APIFY_API_KEY (אופציונלי)"
echo "   • OPENWEATHER_API_KEY (אופציונלי)"
echo "   • ANTHROPIC_API_KEY (אופציונלי)"
echo "   • TAVILY_API_KEY (אופציונלי)"
echo ""
echo "3️⃣  הדבק אותם כאן:"
echo ""

# Interactive input
read -p "NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -sp "SUPABASE_SERVICE_ROLE_KEY (hidden): " SUPABASE_SERVICE_KEY
echo ""
read -p "APIFY_API_KEY (או Enter לדלג): " APIFY_KEY

# Create .env
cat > .env << EOF
# משתני סביבה מ-Vercel
# $(date)

NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY
EOF

if [ -n "$APIFY_KEY" ]; then
    echo "APIFY_API_KEY=$APIFY_KEY" >> .env
fi

echo ""
echo "✅ נוצר .env בהצלחה!"
echo ""
echo "עכשיו הרץ:"
echo "   pnpm dev"
echo ""
