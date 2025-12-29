#!/bin/bash

# Quick restart script for scan-missing-dates
# This will continue from the checkpoint

echo "🔄 מפעיל מחדש את סריקת התאריכים החסרים..."
echo ""

# Check if checkpoint exists
if [ -f .missing-dates-checkpoint.json ]; then
  COMPLETED=$(cat .missing-dates-checkpoint.json | grep -o '"completed_dates":\[' | wc -l)
  if [ "$COMPLETED" -gt 0 ]; then
    TOTAL=$(cat .missing-dates-checkpoint.json | jq '.completed_dates | length')
    echo "📂 נמצא checkpoint קיים: $TOTAL תאריכים הושלמו"
    echo ""
  fi
fi

# Kill any existing scan processes
EXISTING=$(ps aux | grep "scan-missing-dates" | grep -v grep | wc -l)
if [ "$EXISTING" -gt 0 ]; then
  echo "⚠️ מצאתי תהליך סריקה רץ - עוצר אותו..."
  pkill -f "scan-missing-dates"
  sleep 2
  echo "✅ נעצר"
  echo ""
fi

# Start new scan in background
echo "🚀 מתחיל סריקה..."
nohup node scan-missing-dates.mjs > scan-progress.log 2>&1 &
SCAN_PID=$!

echo "✅ הסריקה התחילה!"
echo "   PID: $SCAN_PID"
echo ""
echo "💡 לצפייה בהתקדמות:"
echo "   tail -f scan-progress.log"
echo "   או:"
echo "   node check-scan-status.mjs"
echo ""
echo "🛑 לעצירת הסריקה:"
echo "   kill $SCAN_PID"
echo ""
