#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
const envFile = readFileSync('.env.local', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175'
const API_URL = 'http://localhost:3000/api/scans/execute'
const END_DATE = '2026-03-31'
const TIMEOUT = 300000 // 5 minutes
const DELAY_BETWEEN_SCANS = 2000 // 2 seconds

// Initialize Supabase client
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Get all competitors
async function getCompetitors() {
  const { data, error } = await supabase
    .from('hotel_competitors')
    .select('id, competitor_hotel_name, booking_url')
    .eq('hotel_id', HOTEL_ID)
    .eq('is_active', true)
    .not('booking_url', 'is', null)

  if (error) throw error
  return data
}

// Get last scanned date from database
async function getLastScannedDate() {
  const { data, error } = await supabase
    .from('competitor_daily_prices')
    .select('date')
    .eq('hotel_id', HOTEL_ID)
    .order('date', { ascending: false })
    .limit(1)

  if (error) throw error
  
  if (!data || data.length === 0) {
    // No data yet, start from beginning of Q1
    return '2026-01-01'
  }
  
  // Return next day after last scanned date
  const lastDate = new Date(data[0].date)
  lastDate.setDate(lastDate.getDate() + 1)
  return lastDate.toISOString().split('T')[0]
}

// Generate date range
function getDates(startDate, endDate) {
  const dates = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

// Execute scan for one competitor on one date
async function executeScan(competitorId, date) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId: HOTEL_ID,
        competitorId,
        checkInDate: date,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Critical: Check HTTP status BEFORE parsing JSON
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    // Verify the response has the expected structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format')
    }
    
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Timeout')
    }
    throw error
  }
}

// Main scan function
async function runScan() {
  console.log('🔍 מאתר נקודת checkpoint אוטומטית...\n')
  
  // Auto-detect starting point
  const startDate = await getLastScannedDate()
  console.log(`✅ נמצא checkpoint: מתחיל מ-${startDate}\n`)
  
  const competitors = await getCompetitors()
  const dates = getDates(startDate, END_DATE)
  
  if (dates.length === 0) {
    console.log('✅ הסריקה הושלמה! כל התאריכים כבר נסרקו.')
    return
  }
  
  console.log('📋 רשימת מתחרים:')
  competitors.forEach((comp, i) => {
    console.log(`   ${i + 1}. ${comp.competitor_hotel_name}`)
  })
  
  console.log(`\n📅 תאריכים לסריקה: ${dates.length} ימים`)
  console.log(`🔄 סה"כ סריקות: ${dates.length * competitors.length}`)
  console.log('\n════════════════════════════════════════════════════════════\n')
  
  let totalScans = 0
  let successCount = 0
  let failureCount = 0
  let totalPricesSaved = 0
  const startTime = Date.now()
  
  // Scan per date (so we can checkpoint after each date)
  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const date = dates[dateIndex]
    console.log(`📅 סורק תאריך: ${date}`)
    console.log('─'.repeat(60))
    
    let datePricesSaved = 0
    
    // Scan all competitors for this date
    for (let compIndex = 0; compIndex < competitors.length; compIndex++) {
      const competitor = competitors[compIndex]
      totalScans++
      
      const progress = ((totalScans / (dates.length * competitors.length)) * 100).toFixed(1)
      const now = new Date()
      const timeStr = now.toLocaleTimeString('he-IL', { 
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
      
      console.log(`\n[${totalScans}/${dates.length * competitors.length}] ${progress}%`)
      console.log(`🏨 ${competitor.competitor_hotel_name}`)
      console.log(`📅 ${date}`)
      console.log(`⏰ ${timeStr}`)
      
      try {
        const result = await executeScan(competitor.id, date)
        
        if (result.success) {
          successCount++
          const pricesCount = result.results_count || result.pricesSaved || 0
          datePricesSaved += pricesCount
          console.log(`✅ ${pricesCount} מחירים נשמרו (verified)`)
        } else {
          failureCount++
          const errorMsg = result.error || 'Unknown error'
          console.log(`❌ נכשל: ${errorMsg}`)
          console.error(`[ERROR] Competitor: ${competitor.competitor_hotel_name}, Date: ${date}, Error: ${errorMsg}`)
        }
      } catch (error) {
        failureCount++
        console.log(`❌ נכשל: ${error.message}`)
        console.error(`[ERROR] Competitor: ${competitor.competitor_hotel_name}, Date: ${date}, Exception: ${error.message}`)
      }
      
      // Delay between scans
      if (totalScans < dates.length * competitors.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SCANS))
      }
      
      // Show statistics every 10 scans
      if (totalScans % 10 === 0) {
        totalPricesSaved += datePricesSaved
        const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1)
        const remainingScans = (dates.length * competitors.length) - totalScans
        const avgTimePerScan = (Date.now() - startTime) / totalScans
        const remainingMinutes = Math.ceil((remainingScans * avgTimePerScan) / 60000)
        
        console.log('\n' + '═'.repeat(60))
        console.log('📊 סטטיסטיקה:')
        console.log(`   ✅ הצליחו: ${successCount}`)
        console.log(`   ❌ נכשלו: ${failureCount}`)
        console.log(`   💾 מחירים: ${totalPricesSaved}`)
        console.log(`   ⏱️  זמן: ${elapsedMinutes} דקות`)
        console.log(`   ⏳ נותר: ~${remainingMinutes} דקות`)
        console.log('═'.repeat(60))
        
        datePricesSaved = 0 // Reset for next batch
      }
    }
    
    // After completing all competitors for this date, we have a checkpoint!
    console.log(`\n✅ תאריך ${date} הושלם! (Checkpoint saved)\n`)
  }
  
  // Final statistics
  totalPricesSaved += datePricesSaved
  const totalMinutes = ((Date.now() - startTime) / 60000).toFixed(1)
  const successRate = ((successCount / totalScans) * 100).toFixed(1)
  
  console.log('\n' + '═'.repeat(60))
  console.log('🎉 הסריקה הושלמה בהצלחה!')
  console.log('═'.repeat(60))
  console.log('📊 סטטיסטיקה סופית:')
  console.log(`   📅 תאריכים: ${dates.length}`)
  console.log(`   🔄 סה"כ סריקות: ${totalScans}`)
  console.log(`   ✅ הצליחו: ${successCount} (${successRate}%)`)
  console.log(`   ❌ נכשלו: ${failureCount}`)
  console.log(`   💾 מחירים נשמרו: ${totalPricesSaved}`)
  console.log(`   ⏱️  זמן כולל: ${totalMinutes} דקות`)
  console.log('═'.repeat(60))
}

// Run the scan
runScan().catch(error => {
  console.error('❌ שגיאה חמורה:', error)
  process.exit(1)
})
