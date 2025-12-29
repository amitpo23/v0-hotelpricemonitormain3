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

console.log('🔍 מחלץ נתונים מ-dev-server.log...\n')

const logContent = readFileSync('dev-server.log', 'utf-8')
const lines = logContent.split('\n')

// Get competitor mapping
const { data: competitors, error: compError } = await supabase
  .from('hotel_competitors')
  .select('id, competitor_hotel_name')
  .eq('hotel_id', HOTEL_ID)
  .eq('is_active', true)

if (compError) throw compError

const competitorMap = {}
competitors.forEach(c => {
  competitorMap[c.competitor_hotel_name.trim()] = c.id
})

console.log(`📋 מצאתי ${competitors.length} מתחרים\n`)

// Parse the log
const priceRecords = []
let currentCompetitor = null
let currentDate = null
let currentRooms = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  
  // Detect competitor
  if (line.includes('[RealScraper] Scraping ALL ROOMS:')) {
    const match = line.match(/Scraping ALL ROOMS: (.+)/)
    if (match) {
      currentCompetitor = match[1].trim()
    }
  }
  
  // Detect date
  if (line.includes('[RealScraper] Date:') || line.includes('[BookingScraper] Dates:')) {
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      currentDate = dateMatch[1]
    }
  }
  
  // Detect room prices
  if (line.includes('[RealScraper]   Room ')) {
    const roomMatch = line.match(/Room \d+: (.+?) - (\d+(?:\.\d+)?) (EUR|ILS|USD)/)
    if (roomMatch && currentCompetitor && currentDate) {
      const [, roomType, price, currency] = roomMatch
      currentRooms.push({
        roomType: roomType.trim(),
        price: parseFloat(price),
        currency
      })
    }
  }
  
  // Detect success - save rooms
  if (line.includes('[RealScraper] SUCCESS: Found')) {
    if (currentCompetitor && currentDate && currentRooms.length > 0) {
      const competitorId = competitorMap[currentCompetitor]
      
      if (competitorId) {
        currentRooms.forEach(room => {
          priceRecords.push({
            hotel_id: HOTEL_ID,
            competitor_id: competitorId,
            date: currentDate,
            price: room.price,
            currency: room.currency,
            source: 'Booking.com',
            room_type: room.roomType,
            availability: true,
            scraped_at: new Date().toISOString()
          })
        })
      }
      
      // Reset for next competitor
      currentRooms = []
    }
  }
}

console.log(`💾 נמצאו ${priceRecords.length} מחירים!\n`)

// Remove duplicates
const uniqueRecords = []
const seen = new Set()

priceRecords.forEach(record => {
  const key = `${record.hotel_id}|${record.competitor_id}|${record.date}|${record.source}|${record.room_type}|${record.price}`
  if (!seen.has(key)) {
    uniqueRecords.push(record)
    seen.add(key)
  }
})

console.log(`🧹 אחרי ניקוי duplicates: ${uniqueRecords.length} מחירים ייחודיים\n`)

if (uniqueRecords.length === 0) {
  console.log('❌ לא נמצאו נתונים לשמירה')
  process.exit(0)
}

// Show sample
console.log('📊 דוגמה מהנתונים:')
uniqueRecords.slice(0, 10).forEach((p, i) => {
  const compName = competitors.find(c => c.id === p.competitor_id)?.competitor_hotel_name || 'Unknown'
  console.log(`   ${i+1}. ${p.date} | ${compName} | ${p.price} ${p.currency}`)
})

// Save to database in batches
console.log(`\n💾 שומר ${uniqueRecords.length} מחירים לבסיס הנתונים...\n`)

let saved = 0
let failed = 0

for (let i = 0; i < uniqueRecords.length; i += 50) {
  const batch = uniqueRecords.slice(i, i + 50)
  
  const { error } = await supabase
    .from('competitor_daily_prices')
    .insert(batch)
  
  if (error) {
    // Try one by one to skip only duplicates
    let batchSaved = 0
    let batchFailed = 0
    for (const record of batch) {
      const { error: singleError } = await supabase
        .from('competitor_daily_prices')
        .insert([record])
      
      if (singleError) {
        batchFailed++
      } else {
        batchSaved++
      }
    }
    saved += batchSaved
    failed += batchFailed
    console.log(`⚠️  Batch ${Math.floor(i / 50) + 1}: ${batchSaved} נשמרו, ${batchFailed} כבר קיימים`)
  } else {
    saved += batch.length
    console.log(`✅ Batch ${Math.floor(i / 50) + 1}: ${batch.length} מחירים נשמרו`)
  }
}

console.log('\n═══════════════════════════════════════════════════')
console.log('🎉 השחזור הושלם!')
console.log(`   ✅ נשמרו: ${saved}`)
console.log(`   ❌ נכשלו: ${failed}`)
console.log('═══════════════════════════════════════════════════')
