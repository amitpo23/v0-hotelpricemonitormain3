#!/usr/bin/env node

/**
 * Scan one competitor at a time for better stability
 * Each scan takes ~1-2 minutes instead of 10-20 minutes
 */

import { createClient } from '@supabase/supabase-js'

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175'
const API_URL = 'http://localhost:3000/api/scans/execute'
const START_DATE = '2026-03-06'
const END_DATE = '2026-03-31'
const TIMEOUT = 300000 // 5 minutes per competitor scan
const DELAY_BETWEEN_SCANS = 2000 // 2 seconds

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
)

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║  🏨 סריקה לפי מתחרה - חכם ויציב                          ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// Get all competitors
const { data: competitors, error: competitorsError } = await supabase
  .from('hotel_competitors')
  .select('id, competitor_hotel_name, booking_url')
  .eq('hotel_id', HOTEL_ID)
  .eq('is_active', true)
  .not('booking_url', 'is', null)

console.log('Debug - competitors:', competitors)
console.log('Debug - error:', competitorsError)

if (!competitors || competitors.length === 0) {
  console.error('❌ לא נמצאו מתחרים פעילים')
  process.exit(1)
}

console.log(`📊 נמצאו ${competitors.length} מתחרים פעילים:`)
competitors.forEach((c, i) => {
  console.log(`   ${i + 1}. ${c.competitor_hotel_name}`)
})

// Calculate all dates to scan
const dates = []
const start = new Date(START_DATE)
const end = new Date(END_DATE)
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  dates.push(d.toISOString().split('T')[0])
}

console.log(`\n📅 תאריכים לסריקה: ${dates.length} ימים`)
console.log(`🔄 סה"כ סריקות: ${dates.length * competitors.length}\n`)
console.log('═'.repeat(60))

let totalScans = 0
let successfulScans = 0
let failedScans = 0
let totalPrices = 0
const startTime = Date.now()

// Scan each date with each competitor
for (const date of dates) {
  console.log(`\n📅 סורק תאריך: ${date}`)
  console.log('─'.repeat(60))
  
  for (const competitor of competitors) {
    totalScans++
    const progress = ((totalScans / (dates.length * competitors.length)) * 100).toFixed(1)
    
    console.log(`\n[${totalScans}/${dates.length * competitors.length}] ${progress}%`)
    console.log(`🏨 ${competitor.competitor_hotel_name}`)
    console.log(`📅 ${date}`)
    console.log(`⏰ ${new Date().toLocaleTimeString()}`)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
      
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: HOTEL_ID,
          competitor_id: competitor.id,
          start_date: date,
          days_to_scan: 1
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.results_count > 0) {
        successfulScans++
        totalPrices += data.results_count
        console.log(`✅ ${data.results_count} מחירים נשמרו`)
      } else {
        console.log(`⚠️  אין תוצאות`)
      }
      
    } catch (error) {
      failedScans++
      console.log(`❌ נכשל: ${error.message}`)
    }
    
    // Progress stats every 10 scans
    if (totalScans % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
      const avgPerScan = elapsed / totalScans
      const remaining = ((dates.length * competitors.length) - totalScans) * avgPerScan
      
      console.log('\n' + '═'.repeat(60))
      console.log('📊 סטטיסטיקה:')
      console.log(`   ✅ הצליחו: ${successfulScans}`)
      console.log(`   ❌ נכשלו: ${failedScans}`)
      console.log(`   💾 מחירים: ${totalPrices}`)
      console.log(`   ⏱️  זמן: ${elapsed} דקות`)
      console.log(`   ⏳ נותר: ~${remaining.toFixed(0)} דקות`)
      console.log('═'.repeat(60))
    }
    
    // Small delay between scans
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SCANS))
  }
}

// Final summary
const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
console.log('\n\n╔════════════════════════════════════════════════════════════╗')
console.log('║  🎉 הסריקה הושלמה!                                        ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log('\n📊 סיכום סופי:')
console.log(`   🔄 סה"כ סריקות: ${totalScans}`)
console.log(`   ✅ הצליחו: ${successfulScans} (${(successfulScans/totalScans*100).toFixed(1)}%)`)
console.log(`   ❌ נכשלו: ${failedScans}`)
console.log(`   💾 מחירים נשמרו: ${totalPrices}`)
console.log(`   ⏱️  זמן כולל: ${totalTime} דקות`)
console.log(`   ⚡ ממוצע לסריקה: ${(totalTime/totalScans).toFixed(2)} דקות\n`)
