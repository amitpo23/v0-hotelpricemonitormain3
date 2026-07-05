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

console.log('🔍 בודק מה יש בטבלאות...\n')

// Check hotels table
console.log('📊 טבלה: hotels')
const { data: hotels, error: hotelsError } = await supabase
  .from('hotels')
  .select('*')
  .limit(10)

if (hotelsError) {
  console.error('❌ שגיאה:', hotelsError)
} else if (hotels && hotels.length > 0) {
  console.log(`   נמצאו ${hotels.length} מלונות:`)
  hotels.forEach((h, i) => {
    console.log(`   ${i+1}. ${h.name} | ID: ${h.id}`)
  })
} else {
  console.log('   ⚠️  אין מלונות בטבלה!')
}

// Check hotel_competitors
console.log('\n📊 טבלה: hotel_competitors')
const { data: competitors, error: compError } = await supabase
  .from('hotel_competitors')
  .select('hotel_id, competitor_hotel_name')
  .limit(5)

if (compError) {
  console.error('❌ שגיאה:', compError)
} else if (competitors && competitors.length > 0) {
  console.log(`   נמצאו ${competitors.length} מתחרים (דוגמה):`)
  competitors.forEach((c, i) => {
    console.log(`   ${i+1}. ${c.competitor_hotel_name} | hotel_id: ${c.hotel_id}`)
  })
  
  // Get unique hotel IDs
  const uniqueHotelIds = [...new Set(competitors.map(c => c.hotel_id))]
  console.log(`\n   hotel_id ייחודיים: ${uniqueHotelIds.join(', ')}`)
} else {
  console.log('   ⚠️  אין מתחרים בטבלה!')
}

// Check competitor_daily_prices
console.log('\n📊 טבלה: competitor_daily_prices')
const { data: prices, error: pricesError } = await supabase
  .from('competitor_daily_prices')
  .select('hotel_id')
  .limit(5)

if (pricesError) {
  console.error('❌ שגיאה:', pricesError)
} else if (prices && prices.length > 0) {
  const uniqueHotelIds = [...new Set(prices.map(p => p.hotel_id))]
  console.log(`   hotel_id במחירים: ${uniqueHotelIds.join(', ')}`)
} else {
  console.log('   ⚠️  אין מחירים בטבלה!')
}

console.log('\n═══════════════════════════════════════════════════')
