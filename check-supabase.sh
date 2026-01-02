#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "         SUPABASE TABLES CHECK - Quick Script"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🔍 Checking which method to use..."
echo ""

# Check if server is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Server is running on localhost:3000"
  echo ""
  echo "📊 Checking learning tables via API..."
  echo ""
  
  response=$(curl -s http://localhost:3000/api/learning/check-tables)
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 Summary from API check:"
  echo ""
  
  # Extract results
  pred_accuracy=$(echo "$response" | jq -r '.tables.prediction_accuracy.exists' 2>/dev/null)
  model_perf=$(echo "$response" | jq -r '.tables.model_performance_summary.exists' 2>/dev/null)
  gen_logs=$(echo "$response" | jq -r '.tables.prediction_generation_logs.exists' 2>/dev/null)
  
  if [ "$pred_accuracy" = "true" ]; then
    echo "  ✅ prediction_accuracy - EXISTS"
  else
    echo "  ❌ prediction_accuracy - MISSING"
  fi
  
  if [ "$model_perf" = "true" ]; then
    echo "  ✅ model_performance_summary - EXISTS"
  else
    echo "  ❌ model_performance_summary - MISSING"
  fi
  
  if [ "$gen_logs" = "true" ]; then
    echo "  ✅ prediction_generation_logs - EXISTS"
  else
    echo "  ❌ prediction_generation_logs - MISSING"
  fi
  
  echo ""
  recommendation=$(echo "$response" | jq -r '.recommendation' 2>/dev/null)
  echo "💡 Recommendation: $recommendation"
  
else
  echo "❌ Server is not running on localhost:3000"
  echo ""
  echo "🔧 To check tables, you need to either:"
  echo ""
  echo "  1. Start the server:"
  echo "     npm run dev"
  echo ""
  echo "  2. Or go directly to Supabase Dashboard:"
  echo "     https://supabase.com/dashboard"
  echo ""
  echo "  3. Then run SQL queries in SQL Editor to check tables:"
  echo "     SELECT EXISTS ("
  echo "       SELECT FROM information_schema.tables"
  echo "       WHERE table_name = 'prediction_accuracy'"
  echo "     );"
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 SQL Files Available:"
echo ""
ls -1 create-*.sql 2>/dev/null | while read file; do
  lines=$(wc -l < "$file" 2>/dev/null)
  echo "   📄 $file ($lines lines)"
done

echo ""
echo "🌐 Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql"
echo ""
echo "📖 Full Guide:"
echo "   cat SUPABASE_CHECK_GUIDE.md"
echo ""
echo "═══════════════════════════════════════════════════════════"
