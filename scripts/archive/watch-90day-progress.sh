#!/bin/bash

echo "🔍 מעקב אחר סריקת 90 יום"
echo "================================"
echo ""

while true; do
  clear
  echo "🔍 מעקב אחר סריקת 90 יום - $(date '+%H:%M:%S')"
  echo "================================"
  echo ""
  
  # הצג את הלוג האחרון
  echo "📄 לוג אחרון:"
  tail -20 /tmp/scan-90days.log 2>/dev/null || echo "אין לוג עדיין"
  
  echo ""
  echo "---"
  echo ""
  
  # בדוק את בסיס הנתונים
  echo "📊 נתונים בבסיס הנתונים:"
  TOTAL_COUNT=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=id&scraped_at=gte.$(date -u '+%Y-%m-%dT00:00:00')" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
    | jq '. | length' 2>/dev/null)
  
  if [ ! -z "$TOTAL_COUNT" ]; then
    echo "✅ סה\"כ רשומות היום: $TOTAL_COUNT"
  fi
  
  # בדוק אם התהליך רץ
  if pgrep -f "fill-q1-90days.mjs" > /dev/null; then
    echo "✅ התהליך פועל"
  else
    echo "⚠️ התהליך לא פועל!"
  fi
  
  echo ""
  echo "לעצירה: Ctrl+C"
  
  sleep 30
done
