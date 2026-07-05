#!/usr/bin/env node

/**
 * בדיקה מהירה של סטטוס הסריקה
 */

import { readFileSync } from 'fs'

try {
  const checkpoint = JSON.parse(readFileSync('.missing-dates-checkpoint.json', 'utf8'))
  
  console.log('📊 סטטוס הסריקה של Q1 2026:')
  console.log('================================\n')
  
  console.log(`✅ תאריכים שהושלמו: ${checkpoint.completed_dates.length}/54`)
  console.log(`📦 מחירים נאספו: ${checkpoint.stats.total_prices}`)
  console.log(`✓  הצלחות: ${checkpoint.stats.successful_scans}`)
  console.log(`✗  כשלונות: ${checkpoint.stats.failed_scans}`)
  console.log(`📅 אחרון שהושלם: ${checkpoint.last_completed_date}`)
  console.log(`🕐 עדכון אחרון: ${new Date(checkpoint.last_updated).toLocaleString('he-IL')}`)
  
  const progress = Math.round((checkpoint.completed_dates.length / 54) * 100)
  console.log(`\n📈 התקדמות: ${progress}%`)
  
  const remaining = 54 - checkpoint.completed_dates.length
  console.log(`⏳ נותרו: ${remaining} תאריכים\n`)
  
  // הצג 5 תאריכים אחרונים
  console.log('📆 5 תאריכים אחרונים:')
  checkpoint.completed_dates.slice(-5).forEach(date => {
    console.log(`   ✓ ${date}`)
  })
  
  console.log('')
  
} catch (error) {
  console.error('❌ שגיאה בקריאת checkpoint:', error.message)
  process.exit(1)
}
