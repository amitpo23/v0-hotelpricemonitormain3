#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
const envFile = readFileSync('.env.local', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175'

console.log('🔍 בודק נתונים שנשמרו בבסיס הנתונים...\n')

// Check competitor_daily_prices table
const { data: prices, error: pricesError, count: pricesCount } = await supabase
  .from('competitor_daily_prices')
  .select('*', { count: 'exact' })
  .eq('hotel_id', HOTEL_ID)
  .order('date', { ascending: true })

if (pricesError) {
  console.error('❌ שגיאה בטבלה competitor_daily_prices:', pricesError)
} else {
  console.log('📊 טבלה: competitor_daily_prices')
  console.log(`   סה"כ רשומות: ${pricesCount}`)
  
  if (prices && prices.length > 0) {
    // Get date range
    const dates = [...new Set(prices.map(p => p.date))].sort()
    console.log(`   תאריך ראשון: ${dates[0]}`)
    console.log(`   תאריך אחרון: ${dates[dates.length - 1]}`)
    console.log(`   סה"כ תאריכים שונים: ${dates.length}`)
    
    // Get competitors
    const competitors = [...new Set(prices.map(p => p.competitor_id))]
    console.log(`   סה"כ מתחרים: ${competitors.length}`)
    
    // Show sample data
    console.log('\n   דוגמה מהנתונים (5 ראשונים):')
    prices.slice(0, 5).forEach(p => {
      console.log(`   - תאריך: ${p.date}, מחיר: ${p.price} ${p.currency}, מקור: ${p.source}`)
    })
    
    // Count by source
    const bySour = prices.reduce((acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1
      return acc
    }, {})
    console.log('\n   פילוח לפי מקור:')
    Object.entries(bySour).forEach(([source, count]) => {
      console.log(`   - ${source}: ${count}`)
    })
  }
}

// Check if there are any gaps in dates
console.log('\n🔍 בודק פערים בתאריכים...')
const { data: allDates } = await supabase
  .from('competitor_daily_prices')
  .select('date')
  .eq('hotel_id', HOTEL_ID)
  .order('date')

if (allDates && allDates.length > 0) {
  const uniqueDates = [...new Set(allDates.map(d => d.date))].sort()
  const start = new Date(uniqueDates[0])
  const end = new Date(uniqueDates[uniqueDates.length - 1])
  
  const expectedDates = []
  const current = new Date(start)
  while (current <= end) {
    expectedDates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  const missingDates = expectedDates.filter(d => !uniqueDates.includes(d))
  
  if (missingDates.length > 0) {
    console.log(`\n⚠️  נמצאו ${missingDates.length} תאריכים חסרים:`)
    missingDates.forEach(d => console.log(`   - ${d}`))
  } else {
    console.log('\n✅ אין פערים בתאריכים!')
  }
}

console.log('\n═══════════════════════════════════════════════════')
console.log('✅ בדיקה הושלמה!')
