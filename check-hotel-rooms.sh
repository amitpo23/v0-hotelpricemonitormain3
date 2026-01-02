#!/bin/bash

echo "🔍 Checking Scarlet Hotel Configuration..."
echo ""

# Check if Supabase environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
  echo "ℹ️  Run this SQL in Supabase dashboard:"
  echo ""
  cat check-scarlet-rooms.sql
  exit 1
fi

echo "📊 Database Check:"
echo "Please run this SQL in Supabase:"
echo ""
cat check-scarlet-rooms.sql
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 If total_rooms is not 35, update it with:"
echo "UPDATE hotels SET total_rooms = 35 WHERE name ILIKE '%scarlet%';"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Default fallback values in code:"
grep -r "total_rooms || 50" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l
echo "   files using '|| 50' as fallback"
echo ""
echo "ℹ️  These fallbacks are used when total_rooms is NULL in database"
echo "   The actual value should be set in the database, not hardcoded"
