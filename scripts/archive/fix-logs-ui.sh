#!/bin/bash

# צבעים לפלט
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  תיקון מערכת הלוגים - 3 שלבים${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

# שלב 1: יצירת טבלת prediction_logs
echo -e "${YELLOW}שלב 1: יצירת טבלת prediction_logs ב-Supabase${NC}"
echo ""
echo "1. פתח את Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. בחר את הפרויקט שלך"
echo ""
echo "3. עבור ל-SQL Editor בתפריט השמאלי"
echo ""
echo "4. לחץ על 'New Query'"
echo ""
echo "5. העתק והדבק את הקוד הבא:"
echo ""
echo -e "${GREEN}───────────────────────────────────────────────────────────${NC}"
cat create-prediction-logs-table.sql
echo -e "${GREEN}───────────────────────────────────────────────────────────${NC}"
echo ""
echo "6. לחץ על 'Run' (או Ctrl+Enter)"
echo ""
echo "7. אמור להופיע: 'Success. No rows returned'"
echo ""
read -p "✓ סיימת? לחץ Enter להמשיך..."

# שלב 2: יצירת חיזויים חדשים
echo ""
echo -e "${YELLOW}שלב 2: יצירת חיזויים חדשים (עם לוגים)${NC}"
echo ""
echo "1. לך לדף Predictions:"
echo "   http://localhost:3000/predictions"
echo ""
echo "2. בחר:"
echo "   - Year: 2026"
echo "   - Months: בחר חודש אחד (לדוגמה: January או February)"
echo ""
echo "3. לחץ על 'Generate Predictions'"
echo ""
echo "4. המתן עד שהחיזויים נוצרים (כ-30 שניות)"
echo ""
echo "5. הדף יתרענן אוטומטית"
echo ""
read -p "✓ סיימת? לחץ Enter להמשיך..."

# שלב 3: בדיקת הלוגים
echo ""
echo -e "${YELLOW}שלב 3: בדיקת הלוגים${NC}"
echo ""
echo "1. בטבלת Predictions, חפש חיזוי מ-2026"
echo ""
echo "2. לחץ על כפתור '📄 Logs' בשורה כלשהי"
echo ""
echo "3. צריך להיפתח חלון עם 6 טאבים:"
echo "   - סקירה"
echo "   - Multi-Agent"
echo "   - פקטורים"
echo "   - מחיר"
echo "   - Confidence"
echo "   - תוצאה"
echo ""
echo "4. נווט בין הטאבים לראות את כל הפרטים!"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  אם אתה רואה את הלוגים - מעולה! זה עובד! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}💡 טיפ:${NC} לוגים נשמרים רק עבור:"
echo "   • 5 התאריכים הראשונים בכל הרצה"
echo "   • כל התאריכים אם מוסיפים ?debug=true ל-URL"
echo ""
echo -e "${YELLOW}💡 לבדיקה מהירה:${NC}"
echo "   curl -X POST 'http://localhost:3000/api/predictions/generate?debug=true' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"selectedYear\": 2026, \"selectedMonths\": [2], \"daysAhead\": 3}'"
echo ""
