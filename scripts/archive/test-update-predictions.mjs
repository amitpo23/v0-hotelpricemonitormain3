#!/usr/bin/env node

/**
 * Test Update Predictions
 * בודק את מערכת עדכון התחזיות האוטומטי
 */

console.log('🧪 בודק מערכת עדכון תחזיות...\n')

const CRON_SECRET = process.env.CRON_SECRET
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'vercel.app') || 'http://localhost:3000'

if (!CRON_SECRET) {
  console.warn('⚠️  CRON_SECRET לא מוגדר - מריץ בלי אימות')
}

console.log(`📍 API URL: ${API_URL}`)
console.log(`🔑 CRON_SECRET: ${CRON_SECRET ? 'מוגדר ✅' : 'חסר ⚠️'}`)
console.log('')

// Test local API
async function testUpdatePredictions() {
  try {
    console.log('🚀 קורא ל-/api/cron/update-predictions...')
    
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`
    }
    
    const response = await fetch(`${API_URL}/api/cron/update-predictions`, {
      method: 'GET',
      headers
    })
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ שגיאה:', error)
      return false
    }
    
    const result = await response.json()
    console.log('✅ תשובה:', JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log('\n📈 סיכום:')
      console.log(`   🏨 מלון: ${result.hotel}`)
      console.log(`   📅 תחזיות יומיות: ${result.daily_predictions}`)
      console.log(`   📊 תחזיות חודשיות: ${result.monthly_forecasts}`)
      console.log(`   ⏱️  זמן ריצה: ${result.duration_ms}ms`)
      console.log(`   🕐 זמן: ${new Date(result.timestamp).toLocaleString('he-IL')}`)
    }
    
    return true
  } catch (error) {
    console.error('❌ שגיאה בבדיקה:', error.message)
    return false
  }
}

// Run test
testUpdatePredictions().then(success => {
  if (success) {
    console.log('\n✅ הבדיקה הצליחה!')
    process.exit(0)
  } else {
    console.log('\n❌ הבדיקה נכשלה')
    process.exit(1)
  }
})
