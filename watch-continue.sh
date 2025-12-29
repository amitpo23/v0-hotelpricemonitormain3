#!/bin/bash
echo "🔍 מעקב אחר הסריקה המתקדמת"
echo "==============================="
echo ""
while true; do
  clear
  echo "🔍 מעקב אחר הסריקה - $(date '+%H:%M:%S')"
  echo "==============================="
  echo ""
  echo "📄 לוג אחרון:"
  tail -25 /tmp/continue-scan.log 2>/dev/null || echo "אין לוג"
  echo ""
  echo "---"
  echo "📊 תאריכים בDB:"
  DATES=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=date&hotel_id=eq.716e1e8f-3537-4f67-875d-de3a89642175&date=gte.2026-01-01&date=lte.2026-03-31" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" | jq -r '.[] | .date' 2>/dev/null | sort -u | wc -l)
  echo "תאריכים: $DATES / 90"
  pgrep -f "continue-q1-scan.mjs" > /dev/null && echo "✅ תהליך פועל" || echo "⚠️ תהליך לא פועל"
  echo ""
  echo "לעצירה: Ctrl+C | מתרענן כל 30 שניות"
  sleep 30
done
