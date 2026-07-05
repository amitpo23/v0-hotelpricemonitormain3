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

console.log('🔍 מחלץ נתונים מהלוגים...\n')

// Parse log files to extract scan data
async function parseLogFile(filename) {
  console.log(`📄 מעבד: ${filename}`)
  
  const content = readFileSync(filename, 'utf-8')
  const lines = content.split('\n')
  
  const scans = []
  let currentDate = null
  let currentCompetitor = null
  let currentCompetitorId = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Extract date
    if (line.includes('📅 סורק תאריך:') || line.includes('📅') && !line.includes('🏨')) {
      const match = line.match(/(\d{4}-\d{2}-\d{2})/)
      if (match) {
        currentDate = match[1]
      }
    }
    
    // Extract competitor name
    if (line.includes('🏨')) {
      const match = line.match(/🏨\s+(.+)/)
      if (match) {
        currentCompetitor = match[1].trim()
      }
    }
    
    // Extract success with price count - this means API returned data
    if (line.includes('✅') && line.includes('מחירים נשמרו')) {
      const match = line.match(/✅\s+(\d+)\s+מחירים/)
      if (match && currentDate && currentCompetitor) {
        const priceCount = parseInt(match[1])
        
        // We know the API was supposed to save these prices
        // Let's record this scan
        scans.push({
          date: currentDate,
          competitor: currentCompetitor,
          priceCount: priceCount,
          timestamp: new Date().toISOString()
        })
      }
    }
  }
  
  console.log(`   נמצאו ${scans.length} סריקות מוצלחות`)
  return scans
}

// Get competitor mapping
async function getCompetitorMapping() {
  const { data, error } = await supabase
    .from('hotel_competitors')
    .select('id, competitor_hotel_name')
    .eq('hotel_id', HOTEL_ID)
    .eq('is_active', true)
  
  if (error) throw error
  
  const mapping = {}
  data.forEach(comp => {
    mapping[comp.competitor_hotel_name.trim()] = comp.id
  })
  
  return mapping
}

// Main recovery process
async function recoverData() {
  const logFiles = [
    'scan-SUCCESS-20251226-150146.log',
    'scan-RESUME-20251226-193921.log', 
    'scan-FINAL-20251226-210414.log'
  ]
  
  let allScans = []
  
  for (const logFile of logFiles) {
    try {
      const scans = await parseLogFile(logFile)
      allScans = allScans.concat(scans)
    } catch (error) {
      console.error(`❌ שגיאה בקריאת ${logFile}:`, error.message)
    }
  }
  
  console.log(`\n📊 סה"כ ${allScans.length} סריקות נמצאו`)
  
  // Get competitor mapping
  const competitorMap = await getCompetitorMapping()
  console.log(`\n📋 מצאתי ${Object.keys(competitorMap).length} מתחרים:`)
  Object.entries(competitorMap).forEach(([name, id]) => {
    console.log(`   ${name} -> ${id}`)
  })
  
  // Now we need to actually re-run these scans to get the data
  // Since the API responses were lost, we'll trigger scans for these date/competitor pairs
  
  console.log('\n🔄 עכשיו נריץ מחדש את הסריקות כדי לקבל את הנתונים האמיתיים...')
  console.log('⚠️  זה ייקח זמן כי צריך לגרד מחדש מ-Booking.com\n')
  
  // Group by date to be efficient
  const scansByDate = {}
  allScans.forEach(scan => {
    if (!scansByDate[scan.date]) {
      scansByDate[scan.date] = []
    }
    scansByDate[scan.date].push(scan.competitor)
  })
  
  const dates = Object.keys(scansByDate).sort()
  console.log(`📅 צריך לסרוק ${dates.length} תאריכים שונים`)
  console.log(`   מ-${dates[0]} עד ${dates[dates.length - 1]}\n`)
  
  let successCount = 0
  let failureCount = 0
  let totalPrices = 0
  
  for (const date of dates) {
    console.log(`\n📅 סורק תאריך: ${date}`)
    const competitors = [...new Set(scansByDate[date])] // Remove duplicates
    
    for (const competitorName of competitors) {
      const competitorId = competitorMap[competitorName]
      
      if (!competitorId) {
        console.log(`   ⚠️  ${competitorName} - לא נמצא במערכת`)
        continue
      }
      
      try {
        // Call the API to actually scrape and save
        const response = await fetch('http://localhost:3000/api/scans/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId: HOTEL_ID,
            competitorId: competitorId,
            checkInDate: date
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`   ❌ ${competitorName} - HTTP ${response.status}: ${errorText.substring(0, 100)}`)
          failureCount++
          continue
        }
        
        const result = await response.json()
        
        if (result.success) {
          const prices = result.results_count || 0
          totalPrices += prices
          successCount++
          console.log(`   ✅ ${competitorName} - ${prices} מחירים`)
        } else {
          console.log(`   ❌ ${competitorName} - ${result.error}`)
          failureCount++
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.log(`   ❌ ${competitorName} - ${error.message}`)
        failureCount++
      }
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════')
  console.log('🎉 שחזור הושלם!')
  console.log(`   ✅ הצליחו: ${successCount}`)
  console.log(`   ❌ נכשלו: ${failureCount}`)
  console.log(`   💾 סה"כ מחירים: ${totalPrices}`)
  console.log('═══════════════════════════════════════════════════')
}

recoverData().catch(error => {
  console.error('❌ שגיאה:', error)
  process.exit(1)
})
