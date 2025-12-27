#!/bin/bash
# Monitor the missing dates scan progress

echo "📊 מוניטור סריקת תאריכים חסרים"
echo "════════════════════════════════════════"
echo ""

# Check if scan is running
SCAN_PID=$(pgrep -f "scan-missing-dates.mjs")
if [ -z "$SCAN_PID" ]; then
  echo "⚠️  הסריקה לא רצה כרגע"
  echo ""
  if [ -f "scan-progress.log" ]; then
    echo "📋 לוג אחרון:"
    tail -20 scan-progress.log
  fi
  exit 0
fi

echo "✅ הסריקה רצה (PID: $SCAN_PID)"
echo ""

# Show checkpoint status
if [ -f ".missing-dates-checkpoint.json" ]; then
  echo "📊 סטטוס מ-checkpoint:"
  cat .missing-dates-checkpoint.json | grep -E '"completed_dates"|"failed_dates"|"last_completed_date"|"total_prices"|"successful_scans"|"failed_scans"' | head -10
  echo ""
fi

# Show recent log
echo "📝 לוג אחרון (10 שורות):"
echo "────────────────────────────────────────"
tail -10 scan-progress.log
echo ""

echo "💡 פקודות שימושיות:"
echo "   tail -f scan-progress.log        # צפייה חיה בלוג"
echo "   kill $SCAN_PID                   # עצירת הסריקה"
echo "   node find-missing-dates.mjs      # בדיקת תאריכים חסרים"
echo "   bash monitor-missing-scan.sh     # הצגת סטטוס זה שוב"
