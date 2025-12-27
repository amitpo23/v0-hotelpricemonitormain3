#!/bin/bash

echo "🔍 מעקב אחר סריקת Q1 המחודשת"
echo "================================"
echo ""

while true; do
  clear
  echo "🔍 מעקב אחר סריקת Q1 - $(date '+%H:%M:%S')"
  echo "================================"
  echo ""
  
  # הצג את הלוג האחרון
  echo "📄 לוג אחרון (20 שורות):"
  echo "---"
  tail -20 /tmp/resume-scan.log 2>/dev/null || echo "אין לוג עדיין"
  echo ""
  
  # בדוק כמה תאריכים יש בבסיס הנתונים
  echo "📊 סטטיסטיקות בסיס נתונים:"
  echo "---"
  
  TOTAL_Q1=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=id&hotel_id=eq.716e1e8f-3537-4f67-875d-de3a89642175&date=gte.2026-01-01&date=lte.2026-03-31" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
    | jq '. | length' 2>/dev/null)
  
  UNIQUE_DATES=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=date&hotel_id=eq.716e1e8f-3537-4f67-875d-de3a89642175&date=gte.2026-01-01&date=lte.2026-03-31" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
    | jq -r '.[].date' 2>/dev/null | sort -u | wc -l)
  
  if [ ! -z "$TOTAL_Q1" ]; then
    echo "✅ סה\"כ רשומות Q1: $TOTAL_Q1"
    echo "📅 תאריכים ייחודיים: $UNIQUE_DATES / 90"
    PROGRESS=$(awk "BEGIN {printf \"%.1f\", ($UNIQUE_DATES / 90) * 100}")
    echo "📈 התקדמות: $PROGRESS%"
  fi
  
  echo ""
  echo "תאריכים אחרונים:"
  curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=date&hotel_id=eq.716e1e8f-3537-4f67-875d-de3a89642175&date=gte.2026-01-01&order=date.desc&limit=5" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
    | jq -r '.[].date' 2>/dev/null | sort -u
  
  echo ""
  echo "---"
  
  # בדוק אם התהליך רץ
  if pgrep -f "resume-q1-scan.mjs" > /dev/null; then
    echo "✅ תהליך הסריקה פועל"
  else
    echo "⚠️  תהליך הסריקה לא פועל!"
  fi
  
  echo ""
  echo "לעצירה: Ctrl+C | מתרענן כל 30 שניות..."
  
  sleep 30
done
