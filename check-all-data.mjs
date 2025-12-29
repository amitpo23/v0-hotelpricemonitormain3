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

console.log('🔍 בודק את כל הטבלאות הרלוונטיות...\n')

// 1. Check ALL data in competitor_daily_prices (no hotel_id filter)
console.log('📊 1. בודק competitor_daily_prices (כל המלונות):')
const { count: totalCount } = await supabase
  .from('competitor_daily_prices')
  .select('*', { count: 'exact', head: true })
console.log(`   סה"כ רשומות בכל הטבלה: ${totalCount}`)

// 2. Check for our hotel specifically
console.log('\n📊 2. בודק עבור המלון שלנו (scarlet):')
const { data: ourPrices, count: ourCount } = await supabase
  .from('competitor_daily_prices')
  .select('date, price, currency, source, created_at', { count: 'exact' })
  .eq('hotel_id', HOTEL_ID)
  .order('date', { ascending: false })
  .limit(20)

console.log(`   סה"כ רשומות: ${ourCount}`)
if (ourPrices && ourPrices.length > 0) {
  console.log(`\n   20 רשומות אחרונות (לפי תאריך):`)
  ourPrices.forEach((p, i) => {
    console.log(`   ${i+1}. ${p.date} | ${p.price} ${p.currency} | ${p.source} | נוצר: ${p.created_at?.substring(0,10)}`)
  })
}

// 3. Check date range for Q1 2026 specifically
console.log('\n📊 3. בודק Q1 2026 (2026-01-01 עד 2026-03-31):')
const { data: q1Data, count: q1Count } = await supabase
  .from('competitor_daily_prices')
  .select('date', { count: 'exact' })
  .eq('hotel_id', HOTEL_ID)
  .gte('date', '2026-01-01')
  .lte('date', '2026-03-31')

console.log(`   סה"כ רשומות ב-Q1 2026: ${q1Count}`)
if (q1Data && q1Data.length > 0) {
  const dates = [...new Set(q1Data.map(d => d.date))].sort()
  console.log(`   תאריך ראשון: ${dates[0]}`)
  console.log(`   תאריך אחרון: ${dates[dates.length - 1]}`)
  console.log(`   סה"כ תאריכים: ${dates.length}`)
}

// 4. Check if data exists for dates we think we scanned
console.log('\n📊 4. בודק תאריכים ספציפיים שסרקנו:')
const testDates = ['2026-01-08', '2026-02-07', '2026-03-05', '2026-03-20']
for (const date of testDates) {
  const { count } = await supabase
    .from('competitor_daily_prices')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', HOTEL_ID)
    .eq('date', date)
  console.log(`   ${date}: ${count} רשומות`)
}

console.log('\n═══════════════════════════════════════════════════')
