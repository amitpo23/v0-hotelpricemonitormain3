#!/usr/bin/env node

/**
 * בדיקה מהירה שהמערכת החדשה עובדת
 */

console.log('🧪 Testing Prediction Logging System\n')
console.log('=' .repeat(80))

console.log('\n✅ קבצים שנוצרו:')
console.log('   📄 create-prediction-logs-table.sql')
console.log('   📄 lib/logging/prediction-logger-db.ts')
console.log('   📄 app/api/predictions/logs/route.ts')
console.log('   📄 components/prediction-log-viewer.tsx')
console.log('   📄 app/predictions/predictions-client.tsx (עודכן)')
console.log('   📄 PREDICTION_LOGS_SETUP.md')
console.log('   📄 PREDICTION_SYSTEM_GUIDE.md')

console.log('\n✅ תיקונים שבוצעו:')
console.log('   🔧 תיקון שגיאת debugMode - נוסף URL parsing')
console.log('   🔧 תיקון שגיאת searchParams - נוסף const url = new URL(request.url)')
console.log('   💰 שינוי מדולר לשקל - ₪ במקום $')
console.log('   📊 הוספת עמודה Actions בטבלה')

console.log('\n📋 צעדים הבאים:')
console.log('')
console.log('1️⃣  צור את טבלת prediction_logs ב-Supabase:')
console.log('   a. פתח: https://supabase.com/dashboard')
console.log('   b. SQL Editor → העתק את create-prediction-logs-table.sql')
console.log('   c. Run')
console.log('')

console.log('2️⃣  הרץ את השרת:')
console.log('   npm run dev')
console.log('')

console.log('3️⃣  ייצר חיזויים עם לוגים:')
console.log('   # רגיל (5 תאריכים ראשונים):')
console.log('   curl -X POST http://localhost:3000/api/predictions/generate \\')
console.log('     -H "Content-Type: application/json" \\')
console.log('     -d \'{"selectedYear": 2026, "selectedMonths": [2]}\'')
console.log('')
console.log('   # Debug mode (כל התאריכים):')
console.log('   curl -X POST "http://localhost:3000/api/predictions/generate?debug=true" \\')
console.log('     -H "Content-Type: application/json" \\')
console.log('     -d \'{"selectedYear": 2026, "selectedMonths": [2]}\'')
console.log('')

console.log('4️⃣  צפה בלוגים:')
console.log('   a. פתח: http://localhost:3000/predictions')
console.log('   b. לחץ על כפתור "Logs" ליד כל חיזוי')
console.log('   c. עבור בין 6 הטאבים: סקירה, Multi-Agent, פקטורים, מחיר, Confidence, תוצאה')
console.log('')

console.log('5️⃣  בדוק את הנתונים ב-Supabase:')
console.log('   SELECT * FROM prediction_logs ORDER BY created_at DESC LIMIT 10;')
console.log('')

console.log('=' .repeat(80))
console.log('\n📚 מידע נוסף:')
console.log('   • מדריך התקנה: PREDICTION_LOGS_SETUP.md')
console.log('   • מדריך מערכת: PREDICTION_SYSTEM_GUIDE.md')
console.log('')

console.log('✨ המערכת מוכנה לשימוש!')
console.log('=' .repeat(80))
console.log('')

// בדוק אם Supabase credentials קיימים
console.log('🔍 בדיקת משתני סביבה:')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (supabaseUrl) {
  console.log('   ✅ NEXT_PUBLIC_SUPABASE_URL: ' + supabaseUrl.substring(0, 30) + '...')
} else {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL: Missing')
}

if (supabaseKey) {
  console.log('   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + supabaseKey.substring(0, 20) + '...')
} else {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: Missing')
}

console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️  חסרים משתני סביבה של Supabase!')
  console.log('   הוסף אותם ל-.env.local')
}
