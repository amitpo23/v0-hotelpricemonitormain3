#!/bin/bash

echo "================================================"
echo "🔽 משוך משתני סביבה מ-Vercel"
echo "================================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 מתקין Vercel CLI..."
    npm install -g vercel
fi

echo "🔐 מתחבר ל-Vercel..."
echo "   (תתבקש להתחבר בדפדפן)"
echo ""

# Login to Vercel (if not already logged in)
vercel login

echo ""
echo "📥 מושך משתני סביבה..."
echo ""

# Pull environment variables from Vercel
vercel env pull .env

if [ -f ".env" ]; then
    echo ""
    echo "✅ הצלחה! קובץ .env נוצר"
    echo ""
    echo "📋 משתנים שנמשכו:"
    grep -E "^[A-Z_]+=" .env | sed 's/=.*/=***/' | head -10
    echo ""
    echo "🎉 עכשיו הכל אמור לעבוד!"
    echo ""
    echo "הפעל את השרת:"
    echo "   pnpm dev"
    echo ""
else
    echo ""
    echo "❌ משהו השתבש"
    echo ""
    echo "נסה באופן ידני:"
    echo "1. לך ל-Vercel Dashboard"
    echo "2. Settings → Environment Variables"
    echo "3. העתק את הערכים"
    echo ""
fi
