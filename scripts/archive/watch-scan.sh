#!/bin/bash

echo "👁️  מעקב אחרי סריקה - מתחדש כל 2 דקות"
echo "════════════════════════════════════════════"
echo ""
echo "❌ לעצור: Ctrl+C"
echo ""

while true; do
  clear
  echo "👁️  מעקב אחרי סריקה - $(date '+%H:%M:%S')"
  echo "════════════════════════════════════════════"
  echo ""
  
  # Show checkpoint status
  if [ -f .missing-dates-checkpoint.json ]; then
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('.missing-dates-checkpoint.json', 'utf8'));
      const lastUpdate = new Date(data.last_updated);
      const now = new Date();
      const minutesAgo = Math.round((now - lastUpdate) / 60000);
      
      console.log('📊 מצב הסריקה:');
      console.log('   • תאריכים: ' + data.completed_dates.length + '/54');
      console.log('   • התקדמות: ' + Math.round((data.completed_dates.length / 54) * 100) + '%');
      console.log('   • מחירים: ' + (data.stats?.total_prices || 0));
      console.log('   • עדכון אחרון: ' + minutesAgo + ' דקות');
      console.log('');
      
      if (minutesAgo < 5) {
        console.log('🟢 הסריקה פעילה! (עדכון לפני ' + minutesAgo + ' דק)');
      } else if (minutesAgo < 60) {
        console.log('🟡 ממתין... (עדכון לפני ' + minutesAgo + ' דק)');
      } else {
        const hoursAgo = Math.round(minutesAgo / 60);
        console.log('🔴 ממתין לאיתחול (לפני ' + hoursAgo + ' שעות)');
      }
    "
  else
    echo "⚠️  אין checkpoint עדיין"
  fi
  
  echo ""
  echo "⏰ הריצה הבאה של Monitor: בשעה העגולה הבאה"
  echo "🔄 מתחדש בעוד 120 שניות..."
  echo ""
  echo "════════════════════════════════════════════"
  
  sleep 120
done
