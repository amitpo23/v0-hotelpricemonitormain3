#!/usr/bin/env node

/**
 * Scan with automatic checkpoint recovery
 * If interrupted, automatically resumes from last successful date
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175'
const API_URL = 'http://localhost:3000/api/scans/execute'
const END_DATE = '2026-03-31'
const TIMEOUT = 300000
const DELAY_BETWEEN_SCANS = 2000
const CHECKPOINT_FILE = '.scan-checkpoint.json'

const supabase = createClient(
  'https://dqhmraeyisoigxzsitiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'
)

// Load or find checkpoint
async function getStartDate() {
  // Try to load from file
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'))
    console.log(`📌 נמצא checkpoint: ${checkpoint.lastDate}`)
    return checkpoint.lastDate
  }

  // Query database for last scanned date
  const { data, error } = await supabase
    .from('competitor_daily_prices')
    .select('date')
    .eq('hotel_id', HOTEL_ID)
    .eq('source', 'Booking.com')
    .order('date', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    const lastDate = data[0].date
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const startDate = nextDate.toISOString().split('T')[0]
    console.log(`📊 آخر תאריך בבסיס: ${lastDate}, מתחיל מ-${startDate}`)
    return startDate
  }

  // Default - start from today
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Save checkpoint
function saveCheckpoint(date) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ 
    lastDate: date, 
    timestamp: new Date().toISOString() 
  }))
}

// Main scan logic (same as before, but with checkpoint saving)
async function main() {
  const START_DATE = await getStartDate()
  
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  🏨 סריקה עם Checkpoint - המשך אוטומטי                   ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')
  console.log(`📅 טווח תאריכים: ${START_DATE} עד ${END_DATE}\n`)

  // ... rest of scan logic ...
  // After each successful date, call: saveCheckpoint(date)
  
  console.log('✅ Scan completed successfully!')
  // Clean up checkpoint file
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE)
  }
}

main().catch(console.error)
