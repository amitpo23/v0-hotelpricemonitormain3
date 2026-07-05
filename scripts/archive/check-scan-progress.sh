#!/bin/bash

echo "📊 90-Day Scan Progress Report"
echo "================================================"
echo ""

# Get current count
TOTAL_COUNT=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=id&scraped_at=gte.2025-12-25T07:00:00" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq '. | length')

echo "✅ Total records saved so far: $TOTAL_COUNT"

# Get date range
DATE_RANGE=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=date&scraped_at=gte.2025-12-25T07:00:00&order=date.asc" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq -r '.[0].date, .[-1].date' 2>/dev/null)

if [ ! -z "$DATE_RANGE" ]; then
  FIRST_DATE=$(echo "$DATE_RANGE" | head -1)
  LAST_DATE=$(echo "$DATE_RANGE" | tail -1)
  echo "📅 Date range: $FIRST_DATE to $LAST_DATE"
fi

# Count unique dates
UNIQUE_DATES=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_daily_prices?select=date&scraped_at=gte.2025-12-25T07:00:00" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq -r '.[].date' | sort -u | wc -l)

echo "📆 Unique dates scanned: $UNIQUE_DATES / 90"

# Progress percentage
PROGRESS=$(awk "BEGIN {printf \"%.1f\", ($UNIQUE_DATES / 90) * 100}")
echo "📈 Progress: $PROGRESS%"

echo ""
echo "Recent scan activity from logs:"
tail -50 /tmp/next-server.log | grep -E "Scraping date:|SUCCESS on attempt" | tail -5

echo ""
echo "To monitor in real-time, run:"
echo "  bash /workspaces/v0-hotelpricemonitormain3/monitor-scan.sh"
